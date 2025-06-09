# Ivy Wallet to Cashew Migrator

A web-based tool designed specifically for migrating financial data from Ivy Wallet to Cashew. This application helps you seamlessly transfer your accounts, transactions, and categories between these two personal finance applications.

🔗 **Live App**: [https://sql-spyglass-viewer.lovable.app/](https://sql-spyglass-viewer.lovable.app/)

## Features

- 🔄 One-click migration from Ivy Wallet to Cashew
- 🔍 Preview data before migration
- 🏦 Transfer accounts with balances
- 💰 Move transaction history
- 📂 Import Ivy Wallet backup files directly
- 🎯 Preserve transaction categories and metadata
- 🎨 Modern, responsive UI with dark/light mode support

## About the Apps

- [Cashew App](https://cashewapp.web.app/) - The destination app for your financial data
- [Ivy Wallet](https://github.com/Ivy-Apps/ivy-wallet) - The source app for your existing financial data

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/SahilSoniOrg/sql-spyglass-viewer.git
   cd sql-spyglass-viewer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## How to Migrate Your Data

1. **Export from Ivy Wallet**:
   - Open Ivy Wallet
   - Go to Settings > Backup & Restore > Export Data
   - Choose JSON format for export

2. **Import to this tool**:
   - Click "Upload Ivy Wallet Backup"
   - Select the exported JSON file
   - Review the data preview to ensure everything looks correct

3. **Prepare for Cashew**:
   - The tool will automatically map Ivy Wallet data to Cashew's format
   - You'll see a summary of accounts, transactions, and categories to be migrated

4. **Complete the Migration**:
   - Click "Export for Cashew" to download the migration file
   - Open Cashew App
   - Go to Settings > Import Data
   - Select the downloaded file to complete the migration

## Technologies Used

- ⚛️ React 18 - For building the user interface
- 📱 TypeScript - For type safety and better development experience
- 🎨 shadcn/ui - Beautiful, accessible components
- 🎨 Tailwind CSS - For responsive styling
- 🔄 JSON Schema - For data validation and transformation
- 📊 SQL.js - For handling database operations in the browser

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).
