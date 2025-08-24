# create-privy-app

A CLI tool to quickly scaffold Next.js or Vite applications with Privy integration, Wagmi support, and global wallets.

## Usage

### Quick Start

```bash
# Next.js basic setup
npx create-privy-app my-app --nextjs

# Next.js with Wagmi integration
npx create-privy-app my-app --nextjs --wagmi

# Next.js with Wagmi + global wallets
npx create-privy-app my-app --nextjs --wagmi --global-wallets
```

### All Commands

#### Interactive Mode

```bash
npx create-privy-app                    # Full interactive setup
```

#### Variations

```bash
npx create-privy-app [options] [project-name]
```

#### Help & Info

```bash
npx create-privy-app --help       # Show all options
npx create-privy-app --version    # Show version
```

### Available Flags

- `--nextjs` - Create Next.js app (skip framework selection)
- `--vite` - Create Vite app (skip framework selection)
- `--wagmi` - Include Wagmi integration for using Wagmi hooks
- `--global-wallets` - Shows all the available Global wallets (Abstract, Monad Games ID and more)
- `--help` - Show help information
- `--version` - Show version number
