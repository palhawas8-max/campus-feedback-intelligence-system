-- Migration: Rename "Public Health and Civil Works" to "Maintenance Department"
-- Target table: analysis_results (column: assigned_dept)

UPDATE analysis_results
SET assigned_dept = 'Maintenance Department'
WHERE assigned_dept = 'Public Health and Civil Works';
