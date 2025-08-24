# Create Privy App

A CLI tool to quickly create Next.js or Vite applications with Privy authentication integration.

## Features

- 🚀 Create Next.js or Vite apps with a single command
- 🔐 Automatic Privy integration setup
- 📦 Uses pnpm for package management
- ⚡ Interactive setup with sensible defaults

## Usage

### Development Mode

```bash
pnpm dev
```

### Build and Run

```bash
pnpm build
pnpm start
```

### Global Installation

```bash
npm install -g .
create-privy-app
```

## What it does

### For Next.js apps:

1. Creates a new Next.js project with your preferred settings
2. Installs `@privy-io/react-auth`
3. Creates `/app/providers/providers.tsx` (or `/src/app/providers/providers.tsx` if using src directory)
4. Automatically updates `layout.tsx` to wrap children with the Providers component
5. Creates `.env.local` and `.env.example` files with Privy environment variables
6. Updates `.gitignore` to exclude environment files
7. **Updates `page.tsx` with Privy-branded login/logout example**

### For Vite apps:

1. Creates a new Vite React project
2. Installs `@privy-io/react-auth`
3. Creates `/src/providers.tsx`
4. Automatically updates `main.tsx` to wrap the App component with Providers
5. Creates `.env` and `.env.example` files with Privy environment variables
6. Updates `.gitignore` to exclude environment files
7. **Updates `App.tsx` with Privy-branded login/logout example**
8. **Creates Privy-inspired CSS styling in `App.css`**

## Environment Variables

The CLI automatically sets up environment variables for your Privy credentials:

### Next.js

- `NEXT_PUBLIC_PRIVY_APP_ID` - Your Privy App ID
- `NEXT_PUBLIC_PRIVY_CLIENT_ID` - Your Privy Client ID
- Stored in `.env.local` file

### Vite

- `VITE_PRIVY_APP_ID` - Your Privy App ID
- `VITE_PRIVY_CLIENT_ID` - Your Privy Client ID
- Stored in `.env` file

## Important Note

After creating your project, update the environment variables in the respective `.env` file with your actual Privy credentials from [https://dashboard.privy.io](https://dashboard.privy.io)

## Project Structure

```
create-privy-app/
├── src/
│   ├── index.ts          # Main CLI entry point
│   ├── templates/
│   │   ├── nextjs.ts     # Next.js project creation
│   │   └── vite.ts       # Vite project creation
│   └── utils/
│       └── validation.ts # Input validation utilities
├── dist/                 # Compiled JavaScript
└── package.json
```
