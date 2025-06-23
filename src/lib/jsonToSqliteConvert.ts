import { v4 as uuidv4 } from 'uuid';
import { Database, SqlValue, Statement } from 'sql.js'; // Assuming you've installed @types/sql.js if needed

// === Constants ===
export const DEFAULT_TITLE = "Unnamed Transaction";
export const DEFAULT_CATEGORY_NAME = "Uncategorized";

// === Helper functions ===

/**
 * Converts an integer color (possibly signed) to a hex string in the format 0xffRRGGBB
 */
export function intColorToHex(colorInt: number): string {
  if (colorInt < 0) {
    colorInt = (1 << 32) + colorInt;
  }
  const rgb = colorInt & 0xffffff;
  return `0xff${rgb.toString(16).padStart(6, "0")}`;
}

/**
 * Stubbed icon resolver, returns a constant value
 */
export function getIconNameForCategory(_name: string): string {
  return "image.png";
}

/**
 * Maps reoccurrence interval type to enum values
 */
export function enumReoccurrenceFromInterval(intervalType: string): number {
  const mapping: Record<string, number> = {
    CUSTOM: 0,
    DAILY: 1,
    WEEKLY: 2,
    MONTH: 3,
    YEAR: 4,
  };
  return mapping[intervalType.toUpperCase()] ?? 0;
}

/**
 * Maps transaction type string to enum value.
 * Returns null for EXPENSE, INCOME, TRANSFER as per requirements.
 */
export function enumTransactionTypeFromString(txnType: string): number | null {
  const mapping: Record<string, number | null> = {
    UPCOMING: 0,
    SUBSCRIPTION: 1,
    REPETITIVE: 2,
    CREDIT: 3,
    DEBT: 4,
    EXPENSE: null, // As per requirement
    INCOME: null,  // As per requirement
    TRANSFER: null, // As per requirement
  };
  // Default to 0 if not explicitly mapped, or return null if in the specified set.
  // This logic needs to be careful. The original Python had EXPENSE/INCOME/TRANSFER default to 0.
  // Your requirement is to return null. This is a divergence from Python.
  // Assuming the DB column for 'type' can accept NULL for these cases.
  if (["EXPENSE", "INCOME", "TRANSFER"].includes(txnType.toUpperCase())) {
      return null;
  }
  return mapping[txnType.toUpperCase()] ?? 0;
}

/**
 * Returns the current Unix timestamp in seconds.
 */
export function currentTimestampSec(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Generates a new UUID string.
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Calculates the next date for a recurring rule based on interval.
 * @param startDateMs Unix timestamp in milliseconds for the start date.
 * @param intervalType The type of interval (DAILY, WEEKLY, MONTH, YEAR).
 * @param intervalN The number of intervals.
 * @returns Unix timestamp in seconds for the next date.
 */
export function getNextDateForRecurringRule(
  startDateMs: number,
  intervalType: string,
  intervalN: number
): number {
  const dt = new Date(startDateMs); // startDateMs is in milliseconds

  switch (intervalType.toUpperCase()) {
    case "DAILY":
      dt.setDate(dt.getDate() + intervalN);
      break;
    case "WEEKLY":
      dt.setDate(dt.getDate() + intervalN * 7);
      break;
    case "MONTH":
      // Store the original day of the month
      const originalDayOfMonth = dt.getDate();
      dt.setMonth(dt.getMonth() + intervalN);
      // If setting the month pushes the day past the end of the new month,
      // Date.setMonth will automatically roll over to the next month.
      // We need to cap it to the last day of the *target* month.
      if (dt.getDate() < originalDayOfMonth) {
        dt.setDate(0); // This sets the date to the last day of the *previous* month relative to dt's current state.
                       // E.g., if dt became March 1st from Jan 31st via Feb 29th, dt.setDate(0) makes it Feb 29th.
      }
      break;
    case "YEAR":
      const originalMonth = dt.getMonth();
      const originalDay = dt.getDate();
      dt.setFullYear(dt.getFullYear() + intervalN);
      // If the original date was Feb 29 and the new year is not a leap year,
      // Date.setFullYear will make it March 1. We need to correct it to Feb 28.
      if (originalMonth === 1 && originalDay === 29 && dt.getMonth() === 2 && dt.getDate() === 1) {
          dt.setDate(0); // Sets to last day of previous month, which would be Feb 28 if dt was March 1.
      }
      break;
    default:
      // CUSTOM or unknown type, no change
      break;
  }
  return Math.floor(dt.getTime() / 1000); // Return in seconds
}


// === Internal Database Processors ===

/**
 * Deletes rows with non-numeric primary keys from specified tables.
 */
async function _clearOldData(db: Database): Promise<void> {
    const tablesAndPks = {
        "wallets": "wallet_pk",
        "categories": "category_pk",
        "transactions": "transaction_pk",
        "associated_titles": "associated_title_pk"
    };

    for (const table in tablesAndPks) {
         console.log(" clearing old data for table ", table);
        const pkCol = tablesAndPks[table as keyof typeof tablesAndPks];
        try {
            // GLOB '*[^0-9]*' finds strings that contain any non-digit character.
            // This is equivalent to the Python SQLite query.
            await db.exec(`DELETE FROM ${table} WHERE ${pkCol} GLOB '*[^0-9]*';`);
        } catch (error) {
            console.error(`Error clearing old data from table ${table}:`, error);
            throw error; // Re-throw to indicate a critical failure
        }
    }
}
/**
 * Finds the next available integer order number for a given table.
 */
async function _getNextAvailableOrder(db: Database, table: string, orderColName: string = 'order'): Promise<number> {
  let orderNum = 0;
  while (true) {
      try {
          const query = `SELECT * FROM ${table} WHERE \`${orderColName}\` = ${orderNum};`;

          const results = db.exec(query);
          if (results.length === 0 || results[0].values.length === 0) {
              break; // No row found for this orderNum, it's available
          }
          orderNum += 1; // Row found, try the next orderNum
      } catch (error) {
          console.error(`Error checking order number for table ${table} with db.exec():`, error);
          throw error;
      }
  }
  return orderNum;
}

/**
 * Processes and inserts wallet data into the wallets table.
 */
async function _processWallets(db: Database, data: any): Promise<{ walletPkMap: Record<string, string>, walletIdToName: Record<string, string> }> {
    const wallets = data.accounts || [];
    const walletPkMap: Record<string, string> = {};
    const walletDates: Record<string, number> = {}; // Using number for timestamp in seconds
    const walletIdToName: Record<string, string> = {};

    // Determine earliest transaction date for each wallet
    for (const txn of (data.transactions || [])) {
        const accId = txn.accountId;
        const dtMs = txn.dateTime;
        if (accId && dtMs !== undefined && dtMs !== null) {
            const dtSec = Math.floor(dtMs / 1000);
            if (walletDates[accId] === undefined || dtSec < walletDates[accId]) {
                walletDates[accId] = dtSec;
            }
        }
        // Special handling for transfers to determine toAccountId's earliest date
        if (txn.type && txn.type.toUpperCase() === "TRANSFER") {
            const toAcc = txn.toAccountId;
            if (toAcc && txn.dateTime !== undefined && txn.dateTime !== null) {
                const dtSec = Math.floor(txn.dateTime / 1000);
                if (walletDates[toAcc] === undefined || dtSec < walletDates[toAcc]) {
                    walletDates[toAcc] = dtSec;
                }
            }
        }
    }

    const walletsSorted = [...wallets].sort((a, b) => {
        const orderA = a.orderNum ?? 0;
        const orderB = b.orderNum ?? 0;
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
    });

    console.log("identified wallets ", walletsSorted);
    let currentOrderNum = await _getNextAvailableOrder(db, "wallets");

    for (const w of walletsSorted) {
        const walletPk = generateUUID();
        walletIdToName[w.id] = w.name;
        const color = intColorToHex(w.color ?? 0);
        const dateCreated = walletDates[w.id] ?? currentTimestampSec();

        let stmt: Statement | null = null;
        try {
            stmt = db.prepare("SELECT wallet_pk FROM wallets WHERE name = ?");
            const existingWallet = stmt.getAsObject([w.name]);

            if (Object.keys(existingWallet).length > 0 && !!existingWallet['wallet_pk']) {
                walletPkMap[w.id] = existingWallet.wallet_pk as string;
                await db.exec("UPDATE wallets SET currency = ? WHERE name = ?", [w.currency?.toLowerCase() ?? "", w.name]);
            } else {
                walletPkMap[w.id] = walletPk;
                await db.exec(`
                    INSERT INTO wallets (wallet_pk, name, colour, icon_name, date_created, \`order\`, currency, decimals)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    walletPk,
                    w.name,
                    color,
                    'image.png',
                    dateCreated,
                    currentOrderNum,
                    w.currency?.toLowerCase() ?? "",
                    2
                ]);
                currentOrderNum += 1;
            }
        } catch (error) {
            console.error(`Error processing wallet ${w.name}:`, error);
            throw error;
        } finally {
            if (stmt) stmt.free();
        }
    }
    return { walletPkMap, walletIdToName };
}

/**
 * Processes and inserts category data into the categories table.
 */
async function _processCategories(db: Database, data: any): Promise<{ categoryPkMap: Record<string, string>, defaultCategoryPk: string }> {
    const categories = data.categories || [];
    const categoryPkMap: Record<string, string> = {};

    const incomeCategoryIds = new Set<string>();
    for (const txn of (data.transactions || [])) {
        if (txn.type && txn.type.toUpperCase() === "INCOME") {
            if (txn.categoryId) {
                incomeCategoryIds.add(txn.categoryId);
            }
        }
    }

    const categoriesSorted = [...categories].sort((a, b) => {
        const orderA = a.orderNum ?? 0;
        const orderB = b.orderNum ?? 0;
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
    });

    let defaultCategoryPk: string | null = null;
    // Check if default category exists in input data
    for (const cat of categoriesSorted) {
        if ((cat.name || "").trim().toLowerCase() === DEFAULT_CATEGORY_NAME.toLowerCase()) {
            defaultCategoryPk = generateUUID();
            categoryPkMap[cat.id] = defaultCategoryPk;
            break;
        }
    }
    
    let currentOrderNum = await _getNextAvailableOrder(db, "categories");

    // If default category not found, create it here
    if (defaultCategoryPk === null) {
        defaultCategoryPk = generateUUID();
        try {
            await db.exec(`
                INSERT INTO categories (category_pk, name, colour, icon_name, emoji_icon_name, date_created, \`order\`, income, method_added, main_category_pk)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                defaultCategoryPk,
                DEFAULT_CATEGORY_NAME,
                intColorToHex(0xff999999), // Gray color default
                getIconNameForCategory(DEFAULT_CATEGORY_NAME),
                null,
                currentTimestampSec(),
                currentOrderNum,
                0,
                null,
                null
            ]);
            currentOrderNum += 1;
        } catch (error) {
            console.error(`Error creating default category:`, error);
            throw error;
        }
    }

    for (const cat of categoriesSorted) {
        if (cat.id in categoryPkMap) { // This would be the default category already processed
            continue;
        }

        const categoryPk = generateUUID();
        categoryPkMap[cat.id] = categoryPk;
        const color = intColorToHex(cat.color ?? 0);
        const iconName = getIconNameForCategory(cat.name ?? "");
        const incomeFlag = incomeCategoryIds.has(cat.id) ? 1 : 0;

        let stmt: Statement | null = null;
        try {
            stmt = db.prepare("SELECT category_pk FROM categories WHERE name = ?");
            const existingCategory = stmt.getAsObject([cat.name]);

            if (Object.keys(existingCategory).length > 0 && existingCategory.category_pk !== null && existingCategory.category_pk !== undefined) {
                categoryPkMap[cat.id] = existingCategory.category_pk as string;
                await db.exec("UPDATE categories SET colour = ? WHERE name = ?", [color, cat.name]);
            } else {
                await db.exec(`
                    INSERT INTO categories (category_pk, name, colour, icon_name, emoji_icon_name, date_created, \`order\`, income, method_added, main_category_pk)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    categoryPk,
                    cat.name,
                    color,
                    iconName,
                    null,
                    currentTimestampSec(),
                    currentOrderNum,
                    incomeFlag,
                    null,
                    null
                ]);
                currentOrderNum += 1;
            }
        } catch (error) {
            console.error(`Error processing category ${cat.name}:`, error);
            throw error;
        } finally {
            if (stmt) stmt.free();
        }
    }
    return { categoryPkMap, defaultCategoryPk };
}

/**
 * Processes and inserts transaction data into the transactions table.
 */
async function _processTransactions(
    db: Database,
    data: any,
    walletPkMap: Record<string, string>,
    categoryPkMap: Record<string, string>,
    defaultCategoryPk: string,
    walletIdToName: Record<string, string>
): Promise<{
    txnPkMap: Record<string, string | [string, string]>;
    recurringRuleIdToObj: Record<string, any>;
    recurringRuleIdToTxnPk: Record<string, string>;
    recurringRuleIdToCount: Record<string, number>;
    recurringRuleIdToLatestTxnPk: Record<string, string>;
    recurringRuleIdToLatestDate: Record<string, number>;
}> {
    const transactions = data.transactions || [];
    const txnPkMap: Record<string, string | [string, string]> = {};
    const recurringRuleIdToObj: Record<string, any> = {};
    (data.plannedPaymentRules || []).forEach((rule: any) => {
        recurringRuleIdToObj[rule.id] = rule;
    });

    const recurringRuleIdToTxnPk: Record<string, string> = {};
    const recurringRuleIdToCount: Record<string, number> = {};
    const recurringRuleIdToLatestTxnPk: Record<string, string> = {};
    const recurringRuleIdToLatestDate: Record<string, number> = {};

    for (const txn of transactions) {
        const oldId = txn.id;
        const txnTypeStr = (txn.type || "EXPENSE").toUpperCase();
        const walletFk = walletPkMap[txn.accountId];
        const categoryFk = categoryPkMap[txn.categoryId] ?? defaultCategoryPk;

        if (!walletFk || (txn.dateTime === undefined || txn.dateTime === null)) {
            console.warn(`Skipping transaction ${oldId} due to missing wallet or dateTime.`);
            continue;
        }

        const dateCreated = Math.floor((txn.dateTime ?? 0) / 1000) || currentTimestampSec();
        const incomeFlag = txnTypeStr === "INCOME" ? 1 : 0;
        let note = txn.description || "";

        if (txnTypeStr === "TRANSFER") {
            const fromWalletFk = walletPkMap[txn.accountId];
            const toWalletFk = walletPkMap[txn.toAccountId];
            if (!fromWalletFk || !toWalletFk) {
                console.warn(`Skipping transfer transaction ${oldId} due to missing source or destination wallet.`);
                continue;
            }

            const fromAccName = walletIdToName[txn.accountId];
            const toAccName = walletIdToName[txn.toAccountId];
            note = `Transferred Balance: ${fromAccName} -> ${toAccName}`;

            const incomeTxnPk = generateUUID();
            const expenseTxnPk = generateUUID();

            txnPkMap[oldId] = [incomeTxnPk, expenseTxnPk];

            try {
                // Income part of transfer
                await db.exec(`
                    INSERT INTO transactions
                    (transaction_pk, name, amount, note, category_fk, wallet_fk, date_created, income, paid, created_another_future_transaction, type, date_time_modified)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    incomeTxnPk,
                    txn.title ?? DEFAULT_TITLE,
                    txn.toAmount ?? txn.amount ?? 0,
                    note,
                    categoryFk,
                    toWalletFk,
                    dateCreated,
                    1, // Income
                    1, // Paid
                    0, // Not future
                    enumTransactionTypeFromString(txnTypeStr),
                    currentTimestampSec()
                ]);

                // Expense part of transfer
                await db.exec(`
                    INSERT INTO transactions
                    (transaction_pk, name, amount, note, category_fk, wallet_fk, date_created, income, paid, created_another_future_transaction, paired_transaction_fk, type, date_time_modified)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    expenseTxnPk,
                    txn.title ?? DEFAULT_TITLE,
                    (txn.amount ?? 0) * -1, // Expense is negative
                    note,
                    categoryFk,
                    fromWalletFk,
                    dateCreated,
                    0, // Expense
                    1, // Paid
                    0, // Not future
                    incomeTxnPk, // Paired with the income part
                    enumTransactionTypeFromString(txnTypeStr),
                    currentTimestampSec()
                ]);
            } catch (error) {
                console.error(`Error processing transfer transaction ${oldId}:`, error);
                throw error;
            }
        } else { // Standard Expense/Income transaction
            const txnPk = generateUUID();
            txnPkMap[oldId] = txnPk;

            if (txn.recurringRuleId && recurringRuleIdToObj[txn.recurringRuleId]) {
                const recurringRuleId = txn.recurringRuleId;
                if (!(recurringRuleId in recurringRuleIdToTxnPk)) {
                    recurringRuleIdToTxnPk[recurringRuleId] = txnPk;
                    recurringRuleIdToCount[recurringRuleId] = 1;
                    recurringRuleIdToLatestDate[recurringRuleId] = dateCreated;
                } else {
                    recurringRuleIdToCount[recurringRuleId] += 1;
                }

                // Generate a temporary PK for recurring future transactions
                const tempRecurringPk = recurringRuleIdToTxnPk[recurringRuleId] + '::predict::' + recurringRuleIdToCount[recurringRuleId];
                recurringRuleIdToLatestTxnPk[recurringRuleId] = tempRecurringPk;

                try {
                    await db.exec(`
                        INSERT INTO transactions
                        (transaction_pk, name, amount, note, category_fk, wallet_fk, date_created, income, paid, created_another_future_transaction, type, date_time_modified, period_length, reoccurrence)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        tempRecurringPk,
                        txn.title ?? DEFAULT_TITLE,
                        (txn.amount ?? 0) * ((incomeFlag * 2) - 1), // expense should be negative if incomeFlag is 0
                        note,
                        categoryFk,
                        walletFk,
                        dateCreated,
                        incomeFlag,
                        1, // Paid (for past occurrences)
                        1, // Created another future transaction
                        enumTransactionTypeFromString("REPETITIVE"), // Force REPETITIVE type
                        currentTimestampSec(),
                        recurringRuleIdToObj[recurringRuleId].intervalN ?? 1,
                        enumReoccurrenceFromInterval(recurringRuleIdToObj[recurringRuleId].intervalType ?? "MONTH")
                    ]);
                } catch (error) {
                    console.error(`Error processing recurring transaction (initial entry) ${oldId}:`, error);
                    throw error;
                }
            } else {
                try {
                    await db.exec(`
                        INSERT INTO transactions
                        (transaction_pk, name, amount, note, category_fk, wallet_fk, date_created, income, paid, created_another_future_transaction, type, date_time_modified)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        txnPk,
                        txn.title ?? DEFAULT_TITLE,
                        (txn.amount ?? 0) * ((incomeFlag * 2) - 1),
                        note,
                        categoryFk,
                        walletFk,
                        dateCreated,
                        incomeFlag,
                        1, // Paid
                        0, // Not future
                        enumTransactionTypeFromString(txnTypeStr),
                        currentTimestampSec()
                    ]);
                } catch (error) {
                    console.error(`Error processing transaction ${oldId}:`, error);
                    throw error;
                }
            }
        }
    }
    return {
        txnPkMap,
        recurringRuleIdToObj,
        recurringRuleIdToTxnPk,
        recurringRuleIdToCount,
        recurringRuleIdToLatestTxnPk,
        recurringRuleIdToLatestDate
    };
}

/**
 * Updates the primary keys for recurring transactions in the DB.
 */
async function _updateRecurringTransactionPks(db: Database, recurringRuleIdToLatestTxnPk: Record<string, string>): Promise<void> {
    for (const key in recurringRuleIdToLatestTxnPk) {
        const value = recurringRuleIdToLatestTxnPk[key];
        const originalPk = value.split('::')[0]; // Extract the base UUID

        try {
            await db.exec("UPDATE transactions SET transaction_pk = ? WHERE transaction_pk = ?", [originalPk, value]);
        } catch (error) {
            console.error(`Error updating recurring transaction PK from ${value} to ${originalPk}:`, error);
            // Decide if you want to re-throw or just log for this step
        }
    }
}

/**
 * Processes planned payments (recurring rules) and inserts them as future transactions.
 */
async function _processPlannedPayments(
    db: Database,
    data: any,
    walletPkMap: Record<string, string>,
    categoryPkMap: Record<string, string>,
    defaultCategoryPk: string,
    recurringRuleIdToTxnPk: Record<string, string>,
    recurringRuleIdToCount: Record<string, number>,
    recurringRuleIdToLatestDate: Record<string, number>
): Promise<void> {
    const plannedPayments = data.plannedPaymentRules || [];
    const recurringRuleIdToObj: Record<string, any> = {};
    plannedPayments.forEach((rule: any) => {
        recurringRuleIdToObj[rule.id] = rule;
    });

    for (const rule of plannedPayments) {
        if (rule.startDate === undefined || rule.startDate === null) {
            console.warn(`Skipping planned payment rule ${rule.id} due to missing startDate.`);
            continue;
        }

        const walletFk = walletPkMap[rule.accountId];
        const categoryFk = categoryPkMap[rule.categoryId] ?? defaultCategoryPk;
        if (!walletFk || !categoryFk) {
            console.warn(`Skipping planned payment rule ${rule.id} due to missing wallet or category FK.`);
            continue;
        }

        const recurringRuleId = rule.id;
        let recurringPk: string;

        if (!(recurringRuleId in recurringRuleIdToTxnPk)) {
            // This rule hasn't had any existing transactions, so generate a fresh PK
            recurringPk = generateUUID();
        } else {
            // Reconstruct the expected recurring PK for existing series
            // Get the base UUID from the first transaction in the series
            const basePk = recurringRuleIdToTxnPk[recurringRuleId].split('::')[0];
            const currentCount = recurringRuleIdToCount[recurringRuleId] ?? 0;
            recurringPk = basePk + '::predict::' + (currentCount + 1);
        }

        const startDateMs = rule.startDate; // Original startDate is in milliseconds
        const intervalType = rule.intervalType ?? "CUSTOM";
        const intervalN = rule.intervalN ?? 1;
        const txnTypeStr = (rule.type || "EXPENSE").toUpperCase();

        const amount = rule.amount ?? 0;
        const name = rule.title ?? DEFAULT_TITLE;
        const incomeFlag = txnTypeStr === "INCOME" ? 1 : 0;
        
        let correctedStartDateSec: number;
        if (recurringRuleId in recurringRuleIdToLatestDate) {
            // Use the last processed transaction's date for this rule to calculate the next one
            correctedStartDateSec = getNextDateForRecurringRule(
                recurringRuleIdToLatestDate[recurringRuleId] * 1000, // Convert to ms for helper
                intervalType,
                intervalN
            );
        } else {
            // No existing transactions for this rule, use the rule's start date
            correctedStartDateSec = Math.floor(startDateMs / 1000);
        }

        try {
            await db.exec(`
                INSERT INTO transactions
                (transaction_pk, name, amount, note, category_fk, wallet_fk, date_created,
                income, paid, created_another_future_transaction, type, reoccurrence, period_length,
                original_date_due, date_time_modified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                recurringPk,
                name,
                amount * ((incomeFlag * 2) - 1), // expense should be negative if incomeFlag is 0
                "", // Note is empty for planned payments
                categoryFk,
                walletFk,
                correctedStartDateSec,
                incomeFlag,
                0, // Not paid yet (future transaction)
                0, // Not creating another future transaction from this rule entry
                enumTransactionTypeFromString("REPETITIVE"), // REPETITIVE type
                enumReoccurrenceFromInterval(intervalType),
                intervalN,
                correctedStartDateSec, // Original date due is the same as date_created for future
                currentTimestampSec()
            ]);
        } catch (error) {
            console.error(`Error processing planned payment rule ${rule.id}:`, error);
            throw error;
        }
    }
}

/**
 * Inserts associated titles based on transactions, avoiding duplicates.
 */
async function _processAssociatedTitles(db: Database, data: any, categoryPkMap: Record<string, string>, defaultCategoryPk: string): Promise<void> {
    const transactions = data.transactions || [];
    // Using a Set to track seen titles for a given category to avoid redundant DB checks
    const seenTitlesForCategory = new Map<string, Set<string>>(); // category_pk -> Set<title>
    let orderCounter = 0; // Simple counter for order

    for (const txn of transactions) {
        const categoryId = txn.categoryId;
        const title = txn.title;

        if (categoryId && title) {
            const categoryPk = categoryPkMap[categoryId] ?? defaultCategoryPk;
            
            // Initialize set for this category if it doesn't exist
            if (!seenTitlesForCategory.has(categoryPk)) {
                seenTitlesForCategory.set(categoryPk, new Set<string>());
            }

            // Check if this title for this category has already been processed
            if (seenTitlesForCategory.get(categoryPk)!.has(title)) {
                continue; // Skip if already processed
            }

            let stmt: Statement | null = null;
            try {
                // First, check if it exists in the DB to avoid primary key conflicts
                stmt = db.prepare("SELECT * FROM associated_titles WHERE title = ? AND category_fk = ?");
                const existingTitle = stmt.getAsObject([title, categoryPk]);

                if (Object.keys(existingTitle).length === 0) {
                    await db.exec(`
                        INSERT INTO associated_titles (associated_title_pk, title, category_fk, date_created, \`order\`)
                        VALUES (?, ?, ?, ?, ?)
                    `, [generateUUID(), title, categoryPk, currentTimestampSec(), orderCounter]);
                    orderCounter += 1;
                }
                seenTitlesForCategory.get(categoryPk)!.add(title); // Mark as seen
            } catch (error) {
                console.error(`Error processing associated title '${title}' for category '${categoryPk}':`, error);
                // Decide if you want to re-throw or just log for this step
            } finally {
                if (stmt) stmt.free();
            }
        }
    }
}

// === Main import function ===

/**
 * Imports financial data from a JSON object into an SQLite database.
 *
 * @param databaseJson The full JSON data object, e.g., { fullJson: { accounts: [], categories: [], ... } }.
 * @param db An initialized sql.js Database object.
 */
export const jsonToSqliteConvert = async (databaseJson: any, _databaseInfoJson: any, db: Database): Promise<void> => {
    // Assuming databaseJson.fullJson holds the main data structure as used by Python script
    const data = databaseJson;

    try {
        await _clearOldData(db);
        console.log(" cleared old data ");
        // Note: sql.js transactions:
        // You can wrap multiple exec calls in a single transaction for performance and atomicity.
        // db.exec('BEGIN TRANSACTION;');
        // ... await calls ...
        // db.exec('COMMIT;');
        // For simplicity and matching Python's per-step commit, we'll keep individual commits.

        db.exec('BEGIN TRANSACTION;');
        const { walletPkMap, walletIdToName } = await _processWallets(db, data);
        db.exec('COMMIT;');

        db.exec('BEGIN TRANSACTION;');
        const { categoryPkMap, defaultCategoryPk } = await _processCategories(db, data);
        db.exec('COMMIT;');

        db.exec('BEGIN TRANSACTION;');
        const {
            txnPkMap,
            recurringRuleIdToObj, // Not used here, but returned by function
            recurringRuleIdToTxnPk,
            recurringRuleIdToCount,
            recurringRuleIdToLatestTxnPk,
            recurringRuleIdToLatestDate
        } = await _processTransactions(db, data, walletPkMap, categoryPkMap, defaultCategoryPk, walletIdToName);
        db.exec('COMMIT;');

        db.exec('BEGIN TRANSACTION;');
        await _updateRecurringTransactionPks(db, recurringRuleIdToLatestTxnPk);
        db.exec('COMMIT;');

        db.exec('BEGIN TRANSACTION;');
        await _processPlannedPayments(db, data, walletPkMap, categoryPkMap, defaultCategoryPk, recurringRuleIdToTxnPk, recurringRuleIdToCount, recurringRuleIdToLatestDate);
        db.exec('COMMIT;');

        db.exec('BEGIN TRANSACTION;');
        await _processAssociatedTitles(db, data, categoryPkMap, defaultCategoryPk);
        db.exec('COMMIT;');

        console.log("Import completed successfully.");
    } catch (error) {
        console.error("An error occurred during the import process:", error);
        db.exec('ROLLBACK;'); // Rollback in case of error
        throw error; // Re-throw to allow external handling
    }
};
