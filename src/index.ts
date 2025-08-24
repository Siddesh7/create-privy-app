#!/usr/bin/env node

import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { createNextJsApp } from "./templates/nextjs";
import { createViteApp } from "./templates/vite";
import { validateProjectName } from "./utils/validation";

async function main() {
  console.log(chalk.blue.bold("\n🔐 Welcome to Create Privy App!\n"));

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: "What is your project name?",
      default: "my-privy-app",
      validate: validateProjectName,
    },
    {
      type: "list",
      name: "framework",
      message: "Which framework would you like to use?",
      choices: [
        { name: "Next.js", value: "nextjs" },
        { name: "Vite (React)", value: "vite" },
      ],
    },
  ]);

  const spinner = ora("Creating your project...").start();

  try {
    if (answers.framework === "nextjs") {
      await createNextJsApp(answers.projectName, spinner);
    } else {
      await createViteApp(answers.projectName, spinner);
    }

    spinner.succeed(chalk.green("Project created successfully!"));

    console.log(chalk.blue("\n🎉 Your Privy-enabled app is ready!"));
    console.log(chalk.gray(`\nNext steps:`));
    console.log(chalk.gray(`  1. cd ${answers.projectName}`));

    const envFile = answers.framework === "nextjs" ? ".env.local" : ".env";
    const envVars =
      answers.framework === "nextjs"
        ? "NEXT_PUBLIC_PRIVY_APP_ID and NEXT_PUBLIC_PRIVY_CLIENT_ID"
        : "VITE_PRIVY_APP_ID and VITE_PRIVY_CLIENT_ID";

    console.log(chalk.gray(`  2. Update your Privy credentials in ${envFile}`));
    console.log(chalk.gray(`  3. pnpm dev`));
    console.log(
      chalk.blue(
        `\n🔑 Important: Update ${envVars} in the ${envFile} file with your actual Privy credentials!`
      )
    );
    console.log(chalk.gray(`   Get them from: https://dashboard.privy.io`));
  } catch (error) {
    spinner.fail(chalk.red("Failed to create project"));
    console.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error")
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red("An unexpected error occurred:"), error);
    process.exit(1);
  });
}
