// Utility to export an array of JSON objects to a CSV file
export const exportToCSV = (data, filename) => {
  if (!data || !data.length) {
    console.error('No data provided for export');
    return;
  }

  // Define headers based on the keys of the first object
  const headers = Object.keys(data[0]);

  // Map the data into rows
  const csvRows = [
    headers.join(','), // CSV header row
    ...data.map(row => 
      headers.map(fieldName => {
        let value = row[fieldName];
        // Wrap strings in quotes and handle inner quotes if any
        if (typeof value === 'string') {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ];

  // Join rows with newline characters
  const csvString = csvRows.join('\r\n');

  // Create a blob and trigger a download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
