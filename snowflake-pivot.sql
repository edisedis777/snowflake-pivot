-- Create stored procedure to generate dynamic pivot SQL
CREATE OR REPLACE PROCEDURE GENERATE_PIVOT_SQL(TABLE_NAME STRING)
RETURNS STRING
LANGUAGE JAVASCRIPT
AS
$$
{
    // Get column count and names
    var getColsSql = `
    SELECT COLUMN_NAME, COUNT(*) as COL_COUNT
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = UPPER('${TABLE_NAME}')
    GROUP BY COLUMN_NAME`;
    
    var stmt = snowflake.createStatement({sqlText: getColsSql});
    var cols = stmt.execute();
    
    var colNames = [];
    var colCount = 0;
    
    while (cols.next()) {
        colNames.push(cols.getColumnValue(1));
        colCount = cols.getColumnValue(2);
    }
    
    // Generate the pivot SQL
    var pivotSql = `
    -- Create sequence for row numbering
    CREATE OR REPLACE SEQUENCE ${TABLE_NAME}_seq START = 1 INCREMENT = 1;
    
    -- Create pivoted table
    CREATE OR REPLACE TABLE ${TABLE_NAME}_PIVOTED AS
    WITH numbered_rows AS (
        SELECT 
            SEQ_NEXTVAL('${TABLE_NAME}_seq') AS row_num,
            *
        FROM ${TABLE_NAME}
    ),
    unpivoted AS (
        SELECT 
            row_num,
            key as col_name,
            value as col_value
        FROM numbered_rows,
        LATERAL FLATTEN(input => OBJECT_CONSTRUCT(
            ${colNames.map(col => `'${col}', ${col}`).join(',\n            ')}
        ))
    ),
    row_count AS (
        SELECT COUNT(DISTINCT row_num) as total_rows
        FROM unpivoted
    )
    SELECT 
        col_name,
        ${Array.from({length: Math.ceil(colCount/4)}, (_, i) => 
            `MAX(CASE WHEN row_num = ${i + 1} THEN col_value END) AS row_${i + 1}`
        ).join(',\n        ')}
    FROM unpivoted
    CROSS JOIN row_count
    GROUP BY col_name
    ORDER BY col_name;
    
    -- Drop sequence
    DROP SEQUENCE IF EXISTS ${TABLE_NAME}_seq;`;
    
    return pivotSql;
}
$$;

-- Create procedure to execute pivot for all tables
CREATE OR REPLACE PROCEDURE PIVOT_ALL_TABLES(TABLE_NAMES ARRAY)
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
            var getPivotSql = `CALL GENERATE_PIVOT_SQL('${table}')`;
            var stmt = snowflake.createStatement({sqlText: getPivotSql});
            var pivotSql = stmt.execute();
            pivotSql.next();
            
            // Execute the pivot SQL
            var execStmt = snowflake.createStatement({sqlText: pivotSql.getColumnValue(1)});
            execStmt.execute();
            
            results.push(`Successfully pivoted table: ${table}`);
        } catch (err) {
            results.push(`Error pivoting table ${table}: ${err.message}`);
        }
    });
    
    return results.join('\n');
}
$$;

-- Execute pivot for all tables
DECLARE
    table_list ARRAY := ARRAY_CONSTRUCT('table1', 'table2', 'table3', 'table4', 'table5', 'table6', 'table7', 'table8');
BEGIN
    CALL PIVOT_ALL_TABLES(:table_list);
END;
