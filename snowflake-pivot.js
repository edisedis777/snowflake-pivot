CREATE OR REPLACE PROCEDURE GENERATE_PIVOT_SQL(TABLE_NAME STRING, MAX_ROWS NUMBER)
RETURNS STRING
LANGUAGE JAVASCRIPT
AS
$$
{
    // Get column names
    var getColsSql = `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = UPPER('${TABLE_NAME}')`;
    var stmt = snowflake.createStatement({sqlText: getColsSql});
    var cols = stmt.execute();
    
    var colNames = [];
    while (cols.next()) {
        colNames.push(cols.getColumnValue(1));
    }
    if (colNames.length === 0) {
        throw new Error(`No columns found for table '${TABLE_NAME}'.`);
    }
    
    // Get row count
    var getRowCountSql = `SELECT COUNT(*) as ROW_COUNT FROM ${TABLE_NAME}`;
    var rowStmt = snowflake.createStatement({sqlText: getRowCountSql});
    var rowRes = rowStmt.execute();
    rowRes.next();
    var rowCount = rowRes.getColumnValue(1);
    
    // Cap row count at MAX_ROWS to avoid excessive column creation
    var effectiveRowCount = Math.min(rowCount, MAX_ROWS);
    var results = []; // Initialize results array properly
    
    if (rowCount > MAX_ROWS) {
        // Log a warning
        results.push(`Warning: Table '${TABLE_NAME}' has ${rowCount} rows, but only ${MAX_ROWS} will be pivoted due to MAX_ROWS limit.`);
    }
    
    // Generate the pivot SQL
    var pivotSql = `
    CREATE OR REPLACE TABLE ${TABLE_NAME}_PIVOTED AS
    WITH numbered_rows AS (
        -- Assign row numbers to limit the dataset
        SELECT 
            ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS row_num,
            *
        FROM ${TABLE_NAME}
    ),
    limited_rows AS (
        -- Filter to only include rows we want to pivot
        SELECT * FROM numbered_rows
        WHERE row_num <= ${MAX_ROWS}
    ),
    unpivoted AS (
        -- Flatten the table into key-value pairs
        SELECT 
            row_num,
            key AS col_name,
            value AS col_value
        FROM limited_rows,
        LATERAL FLATTEN(input => OBJECT_CONSTRUCT(
            ${colNames.map(col => `'${col}', "${col}"`).join(',\n            ')}
        ))
    )
    SELECT 
        col_name,
        ${Array.from({length: effectiveRowCount}, (_, i) => 
            `MAX(CASE WHEN row_num = ${i + 1} THEN col_value END) AS row_${i + 1}`
        ).join(',\n        ')}
    FROM unpivoted
    GROUP BY col_name
    ORDER BY col_name;
    -- Note: This pivots the table so that original columns become rows, and original rows become columns (up to ${MAX_ROWS}).
    `;
    
    if (results.length > 0) {
        return `-- ${results.join('\n-- ')}\n${pivotSql}`;
    }
    
    return pivotSql;
}
$$;

-- Create procedure to execute pivot for all tables
CREATE OR REPLACE PROCEDURE PIVOT_ALL_TABLES(TABLE_NAMES ARRAY, MAX_ROWS NUMBER)
RETURNS STRING
LANGUAGE JAVASCRIPT
AS
$$
{
    var results = [];
    
    // Process each table
    TABLE_NAMES.forEach(function(table) {
        try {
            // Generate pivot SQL
            var getPivotSql = `CALL GENERATE_PIVOT_SQL('${table.replace(/'/g, "''")}', ${MAX_ROWS})`;
            var stmt = snowflake.createStatement({sqlText: getPivotSql});
            var pivotSql = stmt.execute();
            pivotSql.next();
            
            // Execute the pivot SQL
            var execStmt = snowflake.createStatement({sqlText: pivotSql.getColumnValue(1)});
            execStmt.execute();
            
            results.push(`Successfully pivoted table: ${table}`);
        } catch (err) {
            results.push(`Error pivoting table '${table}': ${err.message}`);
            // Optionally throw the error to stop execution: throw err;
        }
    });
    
    return results.join('\n');
}
$$;

-- Example execution
DECLARE
    table_list ARRAY := ARRAY_CONSTRUCT('table1', 'table2', 'table3');
    max_rows NUMBER := 1000;  -- Configurable limit on rows to pivot
BEGIN
    CALL PIVOT_ALL_TABLES(:table_list, :max_rows);
END;
