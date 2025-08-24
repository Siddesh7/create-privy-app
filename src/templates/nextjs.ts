import { execa } from "execa";
import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";
import type { Ora } from "ora";

export async function createNextJsApp(projectName: string, spinner: Ora) {
  // Ask Next.js specific questions
  spinner.stop();
  const nextjsAnswers = await inquirer.prompt([
    {
      type: "confirm",
      name: "typescript",
      message: "Would you like to use TypeScript?",
      default: true,
    },
    {
      type: "confirm",
      name: "eslint",
      message: "Would you like to use ESLint?",
      default: true,
    },
    {
      type: "confirm",
      name: "tailwind",
      message: "Would you like to use Tailwind CSS?",
      default: true,
    },
    {
      type: "confirm",
      name: "srcDir",
      message: "Would you like to use `src/` directory?",
      default: false,
    },
    {
      type: "confirm",
      name: "appRouter",
      message: "Would you like to use App Router?",
      default: true,
    },
  ]);

  // Build create-next-app command
  const createNextAppArgs = [
    "create-next-app@latest",
    projectName,
    "--use-pnpm",
    "--yes", // Add this to skip confirmation prompts
  ];

  if (nextjsAnswers.typescript) createNextAppArgs.push("--typescript");
  else createNextAppArgs.push("--javascript");

  if (nextjsAnswers.eslint) createNextAppArgs.push("--eslint");
  else createNextAppArgs.push("--no-eslint");

  if (nextjsAnswers.tailwind) createNextAppArgs.push("--tailwind");
  else createNextAppArgs.push("--no-tailwind");

  if (nextjsAnswers.srcDir) createNextAppArgs.push("--src-dir");
  else createNextAppArgs.push("--no-src-dir");

  if (nextjsAnswers.appRouter) createNextAppArgs.push("--app");
  else createNextAppArgs.push("--no-app");

  createNextAppArgs.push("--import-alias", "@/*");

  console.log("🚀 Creating Next.js project...");
  // Create Next.js app
  await execa("npx", createNextAppArgs, { stdio: "inherit" });

  // Install Privy dependencies
  await execa("pnpm", ["add", "@privy-io/react-auth"], {
    cwd: projectName,
    stdio: "pipe",
  });

  spinner.text = "Setting up Privy integration...";

  // Determine the correct paths
  const appDir = nextjsAnswers.srcDir ? "src/app" : "app";
  const providersDir = path.join(projectName, appDir, "providers");
  const layoutPath = path.join(projectName, appDir, "layout.tsx");

  // Create providers directory
  await fs.ensureDir(providersDir);

  // Create providers.tsx file
  const providersContent = `"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
      config={{
        loginMethodsAndOrder: {
          primary: [
            "email",
            "privy:clpgf04wn04hnkw0fv1m11mnb",
            "privy:cm04asygd041fmry9zmcyn5o5",
            "privy:cmd8euall0037le0my79qpz42",
          ],
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}`;

  await fs.writeFile(
    path.join(providersDir, "providers.tsx"),
    providersContent
  );

  // Create .env.local file for Next.js
  const envContent = `# Privy Configuration
# Get these values from your Privy dashboard: https://dashboard.privy.io
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
NEXT_PUBLIC_PRIVY_CLIENT_ID=your_privy_client_id_here`;

  await fs.writeFile(path.join(projectName, ".env.local"), envContent);

  // Create .env.example file
  const envExampleContent = `# Privy Configuration
# Get these values from your Privy dashboard: https://dashboard.privy.io
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
NEXT_PUBLIC_PRIVY_CLIENT_ID=your_privy_client_id_here`;

  await fs.writeFile(path.join(projectName, ".env.example"), envExampleContent);

  // Ensure .env.local is in .gitignore (Next.js should already include this, but let's be safe)
  const gitignorePath = path.join(projectName, ".gitignore");
  const gitignoreExists = await fs.pathExists(gitignorePath);
  if (gitignoreExists) {
    let gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
    if (!gitignoreContent.includes(".env*.local")) {
      gitignoreContent += "\n# Environment variables\n.env*.local\n";
      await fs.writeFile(gitignorePath, gitignoreContent);
    }
  }

  // Update layout.tsx to include Providers
  const layoutExists = await fs.pathExists(layoutPath);
  if (layoutExists) {
    let layoutContent = await fs.readFile(layoutPath, "utf-8");

    // Add import for Providers
    const importRegex = /import.*from.*['"]\./;
    const importMatch = layoutContent.match(importRegex);

    if (importMatch) {
      layoutContent = layoutContent.replace(
        importMatch[0],
        `${importMatch[0]}\nimport Providers from './providers/providers'`
      );
    } else {
      // If no relative imports found, add after the last import
      const lastImportRegex = /import.*from.*['"][^.]/g;
      const imports = layoutContent.match(lastImportRegex);
      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        layoutContent = layoutContent.replace(
          lastImport,
          `${lastImport}\nimport Providers from './providers/providers'`
        );
      } else {
        // Add at the beginning if no imports found
        layoutContent = `import Providers from './providers/providers'\n${layoutContent}`;
      }
    }

    // Wrap children with Providers
    layoutContent = layoutContent.replace(
      /(\s*{children}\s*)/,
      "\n      <Providers>$1</Providers>"
    );

    await fs.writeFile(layoutPath, layoutContent);
  }

  spinner.text = "Adding Privy authentication example...";

  // Update page.tsx with Privy authentication example
  const pagePath = path.join(projectName, appDir, "page.tsx");
  const pageExists = await fs.pathExists(pagePath);
  if (pageExists) {
    const pageContent = `"use client";

import { usePrivy } from "@privy-io/react-auth";

// Visit /app/providers/providers.tsx (or /src/app/providers/providers.tsx) to view and update your Privy config
// You can now simply use methods from usePrivy hook across your Next.js app

export default function Home() {
  const { ready, authenticated, login, logout } = usePrivy();

  if (!ready) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={loadingStyle}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Next.js + Privy App</h1>
        <p style={textStyle}>
          {authenticated ? "You're logged in! 🎉" : "Please log in to continue"}
        </p>
        
        {authenticated ? (
          <button onClick={logout} style={logoutButtonStyle}>
            Logout
          </button>
        ) : (
          <button onClick={login} style={loginButtonStyle}>
            Login with Privy
          </button>
        )}
        
        <div style={instructionsStyle}>
          <p>📁 Visit <code>/app/providers/providers.tsx</code> to view and update your Privy config</p>
          <p>🎉 Your app is now fully integrated with Privy! You can now provision embedded wallets, smart wallets for your users and much more.</p>
          <p>📖 Read more in docs: <a href="https://docs.privy.io/" target="_blank" rel="noopener noreferrer" style={linkStyle}>https://docs.privy.io/</a></p>
        </div>
      </div>
    </div>
  );
}

const containerStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#fefefe',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: '1rem',
};

const cardStyle = {
  backgroundColor: 'white',
  padding: '3rem 2rem',
  borderRadius: '16px',
  border: '1px solid #f0f0f0',
  textAlign: 'center' as const,
  maxWidth: '420px',
  width: '100%',
};

const titleStyle = {
  fontSize: '2rem',
  fontWeight: '600',
  color: '#1a1a1a',
  marginBottom: '0.5rem',
};

const textStyle = {
  fontSize: '1rem',
  color: '#666666',
  marginBottom: '2.5rem',
  lineHeight: '1.5',
};

const loginButtonStyle = {
  backgroundColor: '#1a1a1a',
  color: 'white',
  border: 'none',
  padding: '0.875rem 2rem',
  borderRadius: '12px',
  fontSize: '1rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  width: '100%',
  maxWidth: '200px',
};

const logoutButtonStyle = {
  backgroundColor: '#f5f5f5',
  color: '#333333',
  border: 'none',
  padding: '0.875rem 2rem',
  borderRadius: '12px',
  fontSize: '1rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  width: '100%',
  maxWidth: '200px',
};

const loadingStyle = {
  fontSize: '1rem',
  color: '#666666',
};

const instructionsStyle = {
  marginTop: '2rem',
  padding: '1.5rem',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: '#666666',
  textAlign: 'left' as const,
};

const linkStyle = {
  color: '#1a1a1a',
  textDecoration: 'underline',
};`;

    await fs.writeFile(pagePath, pageContent);
  }

  spinner.text = "Finalizing setup...";
}
