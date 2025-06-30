import React from 'react'
import { TrashIcon, AlertTriangleIcon } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'

export const ConfirmDeleteModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  itemName,
  isDeleting = false 
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Are you sure?
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              {message}
            </p>
            {itemName && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-sm font-medium text-red-800">
                  Item to delete: <span className="font-normal">{itemName}</span>
                </p>
              </div>
            )}
            <p className="text-sm text-red-600 font-medium">
              This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            icon={<TrashIcon size={16} />}
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}