// src/components/SpreadsheetGrid.jsx
import React, { useEffect, useState, useRef } from 'react';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { Button } from './Button';
// Correctly import your wrapper component
import { ReactSelect } from '../components/Select';

// Custom styles to make react-select look like a flat grid cell
const customSelectStyles = {
  control: (base, { isFocused }) => ({
    ...base,
    border: 0,
    boxShadow: isFocused ? '0 0 0 1px #fbb832' : 'none', // Use box-shadow for focus ring
    minHeight: 'auto',
    height: '100%',
    backgroundColor: 'transparent',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 2px',
    height: '100%',
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
  }),
  indicatorsContainer: (base) => ({
    ...base,
    padding: '0 4px',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: '2px',
  }),
  menu: (base, state) => ({
    ...base,
    ...(state.menuPlacement === 'top' && { marginBottom: '2px' }),
    zIndex: 20,
    width: 'max-content',
    minWidth: '100%',
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999, // A very high z-index
  }),
};

export const SpreadsheetGrid = ({
  columns,
  data,
  onChange,
  minRows = 1,
  maxRows,
  addRowText = 'Add Row',
  isReadOnly = false,
  hideAddRowButton = false,
  actionColumn, 
}) => {
  const [activeCell, setActiveCell] = useState(null);
  const [errors, setErrors] = useState({});
  const gridRef = useRef(null);

  useEffect(() => {
    if (!isReadOnly && data.length < minRows && columns.length > 0 && columns[0].id !== 'info' && !columns[0].id?.startsWith('loading')) {
      const emptyRows = Array(minRows - data.length)
        .fill({})
        .map(() => {
          return columns.reduce(
            (acc, column) => {
              acc[column.accessor] = column.type === 'checkbox' ? false : '';
              return acc;
            },
            {},
          );
        });
      onChange([...data, ...emptyRows]);
    }
  }, [data, minRows, columns, onChange, isReadOnly]);

  const validateCell = (rowIndex, column, value) => {
    if (isReadOnly) return undefined;
    if (column.required && (value === undefined || value === '' || (typeof value === 'string' && value.trim() === ''))) {
      return `${column.header.replace(' *', '')} is required`;
    }
    if (column.validation) {
      return column.validation(value);
    }
    return undefined;
  };

  const updateData = (rowIndex, columnId, value) => {
    if (isReadOnly) return;
    const newData = [...data];
    newData[rowIndex] = { ...newData[rowIndex], [columnId]: value };

    const column = columns.find((col) => col.accessor === columnId);
    if (column) {
      const error = validateCell(rowIndex, column, value);
      setErrors((prev) => ({
        ...prev,
        [rowIndex]: { ...(prev[rowIndex] || {}), [columnId]: error || '' },
      }));
    }
    onChange(newData);
  };

  const addRow = () => {
    if (isReadOnly || (maxRows && data.length >= maxRows)) return;
    const newRow = columns.reduce(
      (acc, column) => {
        acc[column.accessor] = column.type === 'checkbox' ? false : '';
        return acc;
      },
      {},
    );
    onChange([...data, newRow]);
  };

  const removeRow = (rowIndex) => {
    if (isReadOnly || data.length <= minRows) return;
    const newData = [...data];
    newData.splice(rowIndex, 1);
    onChange(newData);
    const newErrors = { ...errors };
    delete newErrors[rowIndex];
    setErrors(newErrors);
  };

  const handleKeyDown = (e, rowIndex, columnIndex) => {
    if (isReadOnly || !activeCell) return;
    if (e.key === 'ArrowUp' && rowIndex > 0) {
      setActiveCell({ rowIndex: rowIndex - 1, columnId: activeCell.columnId }); e.preventDefault();
    } else if (e.key === 'ArrowDown' && rowIndex < data.length - 1) {
      setActiveCell({ rowIndex: rowIndex + 1, columnId: activeCell.columnId }); e.preventDefault();
    } else if (e.key === 'ArrowLeft' && columnIndex > 0) {
      setActiveCell({ rowIndex, columnId: columns[columnIndex - 1].accessor }); e.preventDefault();
    } else if (e.key === 'ArrowRight' && columnIndex < columns.length - 1) {
      setActiveCell({ rowIndex, columnId: columns[columnIndex + 1].accessor }); e.preventDefault();
    } else if (e.key === 'Tab') {
       if (e.shiftKey) {
        if (columnIndex > 0) {
          setActiveCell({ rowIndex, columnId: columns[columnIndex - 1].accessor }); e.preventDefault();
        } else if (rowIndex > 0) {
          setActiveCell({ rowIndex: rowIndex - 1, columnId: columns[columns.length - 1].accessor }); e.preventDefault();
        }
      } else {
        if (columnIndex < columns.length - 1) {
          setActiveCell({ rowIndex, columnId: columns[columnIndex + 1].accessor }); e.preventDefault();
        } else if (rowIndex < data.length - 1) {
          setActiveCell({ rowIndex: rowIndex + 1, columnId: columns[0].accessor }); e.preventDefault();
        }
      }
    }
  };

  useEffect(() => {
    // This effect should still work as react-select renders an <input> element internally
    if (activeCell && gridRef.current && !isReadOnly) {
      const cellElement = gridRef.current.querySelector(
        `[data-row="${activeCell.rowIndex}"][data-column="${activeCell.columnId}"] input, 
         [data-row="${activeCell.rowIndex}"][data-column="${activeCell.columnId}"] select,
         [data-row="${activeCell.rowIndex}"][data-column="${activeCell.columnId}"] textarea`
      );
      if (cellElement) cellElement.focus();
    }
  }, [activeCell, isReadOnly]);

  if (!columns || columns.length === 0) {
    return <div className="p-4 text-gray-500">No columns defined for the grid.</div>;
  }
  
  if (columns[0]?.id === 'info' || columns[0]?.id?.startsWith('loading')) {
     return (
      <div className="w-full border border-black/20 rounded-md bg-white shadow-sm p-4 text-center">
         {columns[0].CellComponent ? columns[0].CellComponent({}) : columns[0].header}
      </div>
    );
  }


  return (
    <div className="w-full border border-black/20 rounded-md bg-white shadow-sm" ref={gridRef}>
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <div className="bg-gray-50 flex border-b border-black/10 sticky top-0 z-10">
            {columns.map((column) => (
              <div
                key={column.id || column.accessor}
                className={`px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-black/10 last:border-r-0 flex-shrink-0 ${column.width || 'min-w-[150px] w-[200px]'}`}
                style={column.width ? { width: column.width, flexBasis: column.width, flexGrow:0 } : {}}
              >
                <div className="flex items-center gap-1">
                  {column.header}
                  {column.required && !isReadOnly && <span className="text-red-500 text-sm">*</span>}
                </div>
              </div>
            ))}
            {actionColumn && (
              <div className={`px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider flex-shrink-0 border-r border-black/10 last:border-r-0 ${actionColumn.width || 'w-24'}`} style={actionColumn.width ? {width: actionColumn.width, flexBasis: actionColumn.width, flexGrow:0} : {}}>
                {actionColumn.header || 'Actions'}
              </div>
            )}
            {!isReadOnly && !actionColumn && (
              <div className="w-12 px-2 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider flex-shrink-0">Del</div>
            )}
          </div>

          <div className="divide-y divide-black/10 overflow-visible">
            {data.map((row, rowIndex) => (
              <div key={rowIndex} className={`flex hover:bg-[#fff8ee] transition-colors ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                {columns.map((column, colIndex) => {
                  const hasError = !isReadOnly && errors[rowIndex]?.[column.accessor];
                  const cellValue = row[column.accessor] || (column.type === 'checkbox' ? false : '');
                  
                  if (column.CellComponent) {
                    return (
                      <div
                        key={`${rowIndex}-${column.id || column.accessor}-custom-cell`}
                        className={`border-r border-black/10 last:border-r-0 relative flex-shrink-0 flex items-center ${column.width || 'min-w-[150px] w-[200px]'} ${column.cellClassName || 'px-2 py-1.5 h-full'}`}
                        style={column.width ? { width: column.width, flexBasis: column.width, flexGrow:0 } : {}}
                        data-row={rowIndex} data-column={column.accessor}
                      >
                        <column.CellComponent rowData={row} rowIndex={rowIndex} />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`${rowIndex}-${column.id || column.accessor}`}
                      className={`border-r border-black/10 last:border-r-0 relative flex-shrink-0 flex items-center ${column.width || 'min-w-[150px] w-[200px]'} ${column.cellClassName || 'h-full'}`}
                      style={column.width ? { width: column.width, flexBasis: column.width, flexGrow:0 } : {}}
                      data-row={rowIndex} data-column={column.accessor}
                    >
                      {isReadOnly || column.isReadOnly ? (
                        <div className="text-sm truncate w-full px-2 py-1.5" title={cellValue?.toString()}>
                          {column.type === 'checkbox' ? (cellValue ? 'Yes' : 'No') : cellValue?.toString() || '-'}
                        </div>
                      ) : column.type === 'select' ? (
                        // --- ⬇️ REFACTORED SELECT BLOCK ---
                        <ReactSelect
                          // Provide a unique ID for react-select internals & accessibility
                          instanceId={`${rowIndex}-${column.accessor}`}
                          options={column.options}
                          // Find the full option object that matches the cell's primitive value
                          value={column.options?.find(opt => opt.value === cellValue) || null}
                          // Extract the primitive value from the selected option object
                          onChange={(selectedOption) => updateData(rowIndex, column.accessor, selectedOption ? selectedOption.value : '')}
                          onFocus={() => setActiveCell({ rowIndex, columnId: column.accessor })}
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                          // Apply custom compact styles
                          styles={customSelectStyles}
                          menuPlacement="top"
                          menuPortalTarget={document.body}
                          className={hasError ? 'ring-1 ring-red-500 rounded-sm' : ''}
                          isDisabled={isReadOnly || column.isReadOnly}
                        />
                      ) : column.type === 'date' ? (
                        <input
                          type="date"
                          value={cellValue}
                          onChange={(e) => updateData(rowIndex, column.accessor, e.target.value)}
                          onFocus={() => setActiveCell({ rowIndex, columnId: column.accessor })}
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                          className={`w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-[#fbb832] text-sm border-0 rounded-sm py-1 px-2 ${hasError ? 'ring-1 ring-red-500' : ''}`}
                          disabled={isReadOnly || column.isReadOnly}
                        />
                      ) : column.type === 'checkbox' ? (
                        <div className="flex items-center justify-center h-full">
                          <input
                            type="checkbox"
                            checked={!!cellValue}
                            onChange={(e) => updateData(rowIndex, column.accessor, e.target.checked)}
                            onFocus={() => setActiveCell({ rowIndex, columnId: column.accessor })}
                            className={`focus:ring-[#fbb832] text-[#fbb832] rounded-sm ${hasError ? 'border-red-500' : ''}`}
                            disabled={isReadOnly || column.isReadOnly}
                          />
                        </div>
                      ) : (
                        <input
                          type={column.type || "text"}
                          value={cellValue}
                          onChange={(e) => updateData(rowIndex, column.accessor, e.target.value)}
                          onFocus={() => setActiveCell({ rowIndex, columnId: column.accessor })}
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                          className={`w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-[#fbb832] text-sm border-0 rounded-sm py-1 px-2 ${hasError ? 'ring-1 ring-red-500' : ''}`}
                          placeholder={column.placeholder || ''}
                          disabled={isReadOnly || column.isReadOnly}
                        />
                      )}
                      {hasError && (
                        <div className="absolute bottom-full left-0 mb-1 bg-red-100 text-red-700 text-xs p-1 rounded z-20 whitespace-nowrap shadow-lg border border-red-200">
                          {errors[rowIndex][column.accessor]}
                        </div>
                      )}
                    </div>
                  );
                })}
                {actionColumn && (
                  <div className={`flex items-center justify-center flex-shrink-0 border-r border-black/10 last:border-r-0 ${actionColumn.width || 'w-24'} ${actionColumn.cellClassName || 'px-2 py-1.5 h-full'}`} style={actionColumn.width ? {width: actionColumn.width, flexBasis: actionColumn.width, flexGrow:0} : {}}>
                    <actionColumn.CellComponent rowData={row} rowIndex={rowIndex} />
                  </div>
                )}
                {!isReadOnly && !actionColumn && (
                  <div className={`w-12 flex items-center justify-center flex-shrink-0 border-r border-black/10 last:border-r-0 ${'px-2 py-1.5 h-full'}`}>
                    <button
                      onClick={() => removeRow(rowIndex)}
                      disabled={data.length <= minRows}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-gray-400 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Remove row"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
             {data.length === 0 && !isReadOnly && (
                <tr><td colSpan={columns.length + (actionColumn || !isReadOnly ? 1 : 0)} className="text-center text-gray-500 py-4">No data. Click "Add Row" to start.</td></tr>
            )}
          </div>
        </div>
      </div>

      {!isReadOnly && !hideAddRowButton && (
        <div className="p-3 bg-gray-50 border-t border-black/10 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={maxRows ? data.length >= maxRows : false}
            icon={<PlusIcon size={16} />}
          >
            {addRowText}
          </Button>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span>{data.length} row(s)</span>
          </div>
        </div>
      )}
    </div>
  );
};