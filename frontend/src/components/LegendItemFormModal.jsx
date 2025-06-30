// src/components/LegendItemFormModal.jsx
import React, { useState, useEffect } from 'react';
import { SaveIcon } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';

export const LegendItemFormModal = ({ isOpen, onClose, onSave, item, isSubmitting }) => {
  const [formData, setFormData] = useState({
    display_name: '', // This is the category
    value: '',
    abbreviation: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setFormData({
          display_name: item.category || '', // allItems returns 'category', server expects 'display_name'
          value: item.actual_value || '',
          abbreviation: item.abbreviation || '',
        });
      } else {
        setFormData({ display_name: '', value: '', abbreviation: '' });
      }
    }
  }, [item, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.display_name || !formData.value) {
      alert('Category and Value are required.');
      return;
    }
    onSave(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Edit Legend Item' : 'Add Legend Item'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Category (e.g., Site, Channel)"
          value={formData.display_name}
          onChange={(e) => handleChange('display_name', e.target.value)}
          placeholder="Enter a category for this item"
          required
          fullWidth
        />
        <Input
          label="Value (Full Name)"
          value={formData.value}
          onChange={(e) => handleChange('value', e.target.value)}
          placeholder="e.g., Google"
          required
          fullWidth
        />
        <Input
          label="Abbreviation (Optional)"
          value={formData.abbreviation}
          onChange={(e) => handleChange('abbreviation', e.target.value)}
          placeholder="e.g., GOG"
          fullWidth
        />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="secondary" icon={<SaveIcon size={16}/>} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};