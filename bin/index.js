#!/usr/bin/env node

import fs from "fs-extra"
import path from "path"
import inquirer from "inquirer"
import chalk from "chalk"
import { execSync } from "child_process"

const templateDir = new URL("../template", import.meta.url).pathname

async function run() {

  console.log(chalk.green("\n🦖 Backurus Project Creator\n"))

  const answers = await inquirer.prompt([
    {
      name: "projectName",
      message: "Project name:",
      default: "backurus-app"
    },
    {
      name: "database",
      message: "Database:",
      type: "list",
      choices: ["mysql","postgres","sqlite"]
    }
  ])

  const projectPath = path.join(process.cwd(), answers.projectName)

  console.log(chalk.yellow("\nCreating project...\n"))

  await fs.copy(templateDir, projectPath)

  process.chdir(projectPath)

  console.log(chalk.blue("Installing dependencies...\n"))

  execSync("npm install", { stdio: "inherit" })

  console.log(chalk.green("\n✔ Backurus project created!\n"))

  console.log(`
Next steps:

cd ${answers.projectName}

node urus serve

Open:
http://localhost:3000
`)

}

run()