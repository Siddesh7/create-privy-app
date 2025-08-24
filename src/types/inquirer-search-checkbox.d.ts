declare module "inquirer-search-checkbox" {
  interface SearchCheckboxPromptOptions {
    name: string;
    message: string;
    choices: Array<{
      name: string;
      value: string;
    }>;
    pageSize?: number;
    highlight?: boolean;
    searchable?: boolean;
  }

  const searchCheckbox: any;
  export default searchCheckbox;
}
