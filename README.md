# Snowflake Dynamic Pivot Utilities
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
A pair of powerful Snowflake stored procedures for dynamically pivoting tables in your Snowflake data warehouse.

## 🚀 Overview

When analyzing data, you sometimes need to transform row-oriented data into column-oriented format (or vice versa). This "pivoting" operation can be challenging to code manually, especially when you don't know the number of columns in advance.

These utilities solve this problem by:

1. Automatically detecting all columns in your source table
2. Generating optimized SQL to transform rows into columns
3. Creating a new pivoted table with a configurable row limit
4. Supporting batch operations across multiple tables

## ⚙️ Features

- **Dynamic Column Detection**: Automatically identifies all columns in source tables
- **Row Limiting**: Configurable maximum rows to prevent excessive column creation
- **Batch Processing**: Process multiple tables with a single procedure call
- **Error Handling**: Graceful error reporting when issues occur
- **Performance Optimized**: Uses efficient Snowflake features like LATERAL FLATTEN

## 📋 Installation

Copy and paste the following SQL into your Snowflake worksheet:

```sql
-- Create the GENERATE_PIVOT_SQL procedure
CREATE OR REPLACE PROCEDURE GENERATE_PIVOT_SQL(TABLE_NAME STRING, MAX_ROWS NUMBER)
RETURNS STRING
LANGUAGE JAVASCRIPT
AS
$$
{
    // Code for GENERATE_PIVOT_SQL (see repository files)
}
$$;

-- Create the PIVOT_ALL_TABLES procedure
CREATE OR REPLACE PROCEDURE PIVOT_ALL_TABLES(TABLE_NAMES ARRAY, MAX_ROWS NUMBER)
RETURNS STRING
LANGUAGE JAVASCRIPT
AS
$$
{
    // Code for PIVOT_ALL_TABLES (see repository files)
}
$$;
```

## 🔍 Usage

### Basic Usage - Single Table

```sql
-- Pivot a single table with a maximum of 1000 rows
CALL GENERATE_PIVOT_SQL('YOUR_TABLE_NAME', 1000);
```

### Advanced Usage - Multiple Tables

```sql
-- Pivot multiple tables at once
DECLARE
    table_list ARRAY := ARRAY_CONSTRUCT('table1', 'table2', 'table3');
    max_rows NUMBER := 1000;
BEGIN
    CALL PIVOT_ALL_TABLES(:table_list, :max_rows);
END;
```

## 🧩 How It Works

The solution works in several steps:

1. **Column Identification**: Queries Snowflake's information schema to determine all columns in the source table
2. **Row Counting**: Calculates the total number of rows and applies the configured limit
3. **Dynamic SQL Generation**: Creates optimized SQL for the pivot operation using CTEs
4. **Execution**: Runs the generated SQL to create the pivoted table

The result is a new table with the naming convention `{original_table_name}_PIVOTED` where:
- Original columns become rows in the first column
- Original rows become columns (up to the configured max_rows limit)

## ⚠️ Limitations

- The procedure has a MAX_ROWS parameter to avoid creating tables with too many columns
- Column names with special characters may require additional handling
- Very large tables might require optimization for performance
- The pivoted table requires storage space in addition to your original table

## 📝 Example

Original table `SALES_DATA`:

| DATE       | REGION  | PRODUCT | AMOUNT |
|------------|---------|---------|--------|
| 2023-01-01 | East    | WidgetA | 1000   |
| 2023-01-02 | West    | WidgetB | 1500   |
| 2023-01-03 | Central | WidgetA | 1200   |

After pivoting, table `SALES_DATA_PIVOTED`:

| COL_NAME | ROW_1      | ROW_2      | ROW_3      |
|----------|------------|------------|------------|
| DATE     | 2023-01-01 | 2023-01-02 | 2023-01-03 |
| REGION   | East       | West       | Central    |
| PRODUCT  | WidgetA    | WidgetB    | WidgetA    |
| AMOUNT   | 1000       | 1500       | 1200       |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
