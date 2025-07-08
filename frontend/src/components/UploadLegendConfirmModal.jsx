// src/components/UploadLegendConfirmModal.jsx
import React, { useState, useMemo } from 'react';
import { UploadCloudIcon } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import { ReactSelect } from './Select';

export const UploadLegendConfirmModal = ({ isOpen, onClose, onConfirm, parsedData, isUploading }) => {
  const [editedData, setEditedData] = useState(parsedData);
  const [mergeMode, setMergeMode] = useState('update'); // 'update', 'replace_category', 'add_new'

  const columns = useMemo(() => [
    { id: 'category', header: 'Category', accessor: 'category', width: '200px' },
    { id: 'value', header: 'Value', accessor: 'value', width: '250px' },
    { id: 'abbreviation', header: 'Abbreviation', accessor: 'abbreviation', width: '150px' },
  ], []);

  const mergeOptions = [
    { value: 'update', label: 'Update & Add', description: 'Updates existing items and adds new ones.' },
    { value: 'add_new', label: 'Add New Only', description: 'Skips any items that already exist.' },
    { value: 'replace_category', label: 'Replace Categories', description: 'Deletes all existing items in the uploaded categories, then adds the new ones.' },
  ];

  const handleConfirm = () => {
    onConfirm({
      items: editedData,
      mode: mergeMode,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Legend Upload">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Review & Edit Uploaded Items</h3>
          <p className="text-sm text-gray-600 mb-4">
            You can make changes to the data below before it's saved. The data is grouped by the categories found in your file.
          </p>
          <div className="max-h-[40vh] overflow-y-auto border rounded-md">
            <SpreadsheetGrid
              columns={columns}
              data={editedData}
              onChange={setEditedData}
              minRows={0}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Choose Upload Method</h3>
          <ReactSelect
            options={mergeOptions}
            value={mergeOptions.find(opt => opt.value === mergeMode)}
            onChange={option => setMergeMode(option.value)}
            getOptionLabel={opt => (
              <div>
                <strong>{opt.label}</strong>
                <div className="text-xs text-gray-500">{opt.description}</div>
              </div>
            )}
            fullWidth
          />
          {mergeMode === 'replace_category' && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              <strong>Warning:</strong> This will permanently delete all existing legend items for the categories present in your upload file. This action cannot be undone.
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            icon={<UploadCloudIcon size={16} />}
            onClick={handleConfirm}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Confirm & Upload'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};