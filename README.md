# create-privy-app

A CLI tool to quickly scaffold Next.js or Vite applications with Privy, Wagmi, and global wallet support.

## Quick Start

```bash
# Using npm
npx create-privy-app my-app

# Using pnpm
pnpm dlx create-privy-app my-app

# Using yarn
yarn create privy-app my-app

# Using bun
bunx create-privy-app my-app
```

## Usage

### Basic Commands

```bash
# Interactive mode (prompts for all options)
create-privy-app my-app

# Next.js app with short flag
create-privy-app my-app -n

# Vite app with short flag
create-privy-app my-app -v

# With global wallets and Wagmi
create-privy-app my-app -n -g -w
```

### Complete Syntax

```bash
create-privy-app [project-name] [options]
```

## Framework Options

| Flag       | Short | Description                                    |
| ---------- | ----- | ---------------------------------------------- |
| `--nextjs` | `-n`  | Create a Next.js app (TypeScript + App Router) |
| `--vite`   | `-v`  | Create a Vite app (React + TypeScript)         |

## Feature Flags

| Flag               | Short | Description                                                 |
| ------------------ | ----- | ----------------------------------------------------------- |
| `--global-wallets` | `-g`  | Include global wallet selection (Abstract, Monad Games ID.) |
| `--wagmi`          | `-w`  | Include Wagmi integration for advanced wallet functionality |

## Help

| Flag        | Short | Description           |
| ----------- | ----- | --------------------- |
| `--help`    | `-h`  | Show help information |
| `--version` | `-V`  | Show version number   |
