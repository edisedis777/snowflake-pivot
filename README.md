# Snowflake Dynamic Pivot Stored Procedures
[![Visual Studio Code](https://custom-icon-badges.demolab.com/badge/Visual%20Studio%20Code-0078d7.svg?logo=vsc&logoColor=white)](#)
[![Markdown](https://img.shields.io/badge/Markdown-%23000000.svg?logo=markdown&logoColor=white)](#)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Snowflake stored procedures written in JavaScript to dynamically generate and execute SQL for pivoting tables. The pivot operation transforms a table by converting its columns into rows and spreading the values from the original rows into new columns based on row numbers, with a configurable limit on the number of rows to pivot. This approach helps manage performance and avoids exceeding Snowflake's column limits.

## Procedures
1. GENERATE_PIVOT_SQL(TABLE_NAME STRING, MAX_ROWS NUMBER)
- Purpose: Generates a SQL string to pivot the specified table, capping the number of rows pivoted to prevent excessive column creation.
- **Inputs:**
- TABLE_NAME: The name of the table to pivot (case-insensitive, converted to uppercase internally).
- MAX_ROWS: The maximum number of rows to pivot, limiting the number of columns in the pivoted table.
- **Output:**
  A string containing the SQL code to create a pivoted version of the table as ${TABLE_NAME}_PIVOTED.
- #### Behavior:
- Retrieves column names from INFORMATION_SCHEMA.COLUMNS.
- Assigns row numbers using ROW_NUMBER() and limits rows to MAX_ROWS.
- Unpivots the table into key-value pairs (col_name and col_value) with row numbers.
- Pivots the data, grouping by col_name and spreading col_value into columns (row_1, row_2, etc.) up to MAX_ROWS.
- Warns if the table has more rows than MAX_ROWS.
2. PIVOT_ALL_TABLES(TABLE_NAMES ARRAY, MAX_ROWS NUMBER)
- Purpose: Executes the pivot operation for each table in an array of table names, using the specified MAX_ROWS limit.
- **Inputs:**
- TABLE_NAMES: An array of table names to pivot.
- MAX_ROWS: The maximum number of rows to pivot for each table.
- **Output:** A string summarizing success or error messages for each table processed.
- Behavior:
- Loops through the array of table names.
- Calls GENERATE_PIVOT_SQL for each table to generate the pivot SQL.
- Executes the SQL to create the pivoted table.
- Returns feedback like "Successfully pivoted table: table1" or error details.

## Usage

#### Prerequisites
- Ensure you have permissions in Snowflake to create stored procedures and tables.
- The tables to pivot must exist in the current schema or be fully qualified (e.g., database.schema.table_name).

#### Steps
1. Deploy the Procedures
-Copy and execute the SQL code in Snowflake to create the stored procedures. Replace the placeholders with the full JavaScript code from this repository.
```sql
-- Deploy GENERATE_PIVOT_SQL
CREATE OR REPLACE PROCEDURE GENERATE_PIVOT_SQL(TABLE_NAME STRING, MAX_ROWS NUMBER)
RETURNS STRING
LANGUAGE JAVASCRIPT
AS
$$ [insert full JavaScript code here] $$;

-- Deploy PIVOT_ALL_TABLES
CREATE OR REPLACE PROCEDURE PIVOT_ALL_TABLES(TABLE_NAMES ARRAY, MAX_ROWS NUMBER)
RETURNS STRING
LANGUAGE JAVASCRIPT
AS
$$ [insert full JavaScript code here] $$;
```

2. Pivot a Single Table
-Generate the pivot SQL and execute it to create the pivoted table.
```sql
-- Generate pivot SQL
CALL GENERATE_PIVOT_SQL('your_table_name', 1000);

-- Execute the returned SQL (copy the output manually or store it)
CREATE OR REPLACE TABLE your_table_name_PIVOTED AS
[paste the generated SQL here];
```

3. Pivot Multiple Tables
- Use an array of table names to pivot multiple tables at once.
```sql
DECLARE
    table_list ARRAY := ARRAY_CONSTRUCT('table1', 'table2', 'table3');
    max_rows NUMBER := 1000;  -- Adjust as needed
BEGIN
    CALL PIVOT_ALL_TABLES(:table_list, :max_rows);
END;
This creates tables like table1_PIVOTED, table2_PIVOTED, etc.
```

## Example Output
- For a table employees:

|emp_id	| name	| dept |
| ----- |------ | ---- |
|1	    | Alice	| HR   |
|2	    | Bob	  | IT   |

- After running GENERATE_PIVOT_SQL('employees', 2), the result (employees_PIVOTED) is:

| col_name	| row_1	| row_2 |
| --------- | ----- | ----- |
| emp_id	  | 1	    | 2     |
| name	    | Alice	|   Bob |
| dept	    | HR	  | IT    |

- With MAX_ROWS set to 1:

| col_name	| row_1 |
| ---------- | ---- | 
| emp_id	  | 1     |
| name	    | Alice |
| dept	    | HR    | 


## Limitations
- Column Explosion: Even with MAX_ROWS, pivoting many rows can create numerous columns, potentially hitting Snowflake’s limit (around 16,000 columns) or slowing performance.
- Table Overwrite: The pivoted table (${TABLE_NAME}_PIVOTED) overwrites any existing table with the same name.
- Performance: Large datasets may experience slow performance due to FLATTEN and pivot operations. Test with small datasets first.

## Potential Improvements
- Add error handling to halt execution on critical failures.
- Include logging for warnings and errors.
- Allow custom names for pivoted tables instead of the default ${TABLE_NAME}_PIVOTED.

## License
- This project is licensed under the MIT License - see the LICENSE file for details.
