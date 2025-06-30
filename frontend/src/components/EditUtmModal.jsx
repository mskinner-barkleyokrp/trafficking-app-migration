// src/components/EditUtmModal.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SaveIcon, Loader2Icon } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { ReactSelect } from './Select'; // Corrected import
import { Modal } from './Modal';

// Moved outside the component to prevent re-creation on every render

export const EditUtmModal = ({ 
    isOpen, 
    onClose, 
    onSave, 
    utm, // The UTM object to edit
    generateFullUtmUrlCallback, // Pass the UTMBuilder's generation function
    isSubmitting,
    clientName, // Optional: display associated client name
    campaignName, // Optional: display associated campaign name
    sourceOptions,
    mediumOptions
}) => {
  const [formData, setFormData] = useState({
    landingPageUrl: '',
    source: '',
    medium: '',
    campaign: '', // This is the utm_campaign parameter value
    term: '',
    content: '',
  });
  const [currentFullUrl, setCurrentFullUrl] = useState('');

  // All hooks and helper functions remain unchanged
  const extractLandingPage = (fullUrl) => {
    if (!fullUrl) return '';
    try {
      const urlObj = new URL(fullUrl);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch (e) {
      const parts = fullUrl.split('?');
      return parts[0] || '';
    }
  };

  useEffect(() => {
    if (utm) {
      const landingPage = extractLandingPage(utm.full_url);
      setFormData({
        landingPageUrl: landingPage,
        source: utm.source || '',
        medium: utm.medium || '',
        campaign: utm.campaign_name || '',
        term: utm.term || '',
        content: utm.content || '',
      });
      setCurrentFullUrl(utm.full_url || '');
    } else {
      setFormData({ landingPageUrl: '', source: '', medium: '', campaign: '', term: '', content: '' });
      setCurrentFullUrl('');
    }
  }, [utm]);

  const regenerateUrl = useCallback(() => {
    if (typeof generateFullUtmUrlCallback === 'function') {
        const rowDataForUrlGen = {
            landingPageUrl: formData.landingPageUrl,
            source: formData.source,
            medium: formData.medium,
            campaign: formData.campaign,
            term: formData.term,
            content: formData.content
        };
        const newUrl = generateFullUtmUrlCallback(rowDataForUrlGen, [], null);
        setCurrentFullUrl(newUrl);
    }
  }, [formData, generateFullUtmUrlCallback]);

  useEffect(() => {
    regenerateUrl();
  }, [formData, regenerateUrl]);


  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.source || !formData.medium || !formData.landingPageUrl) {
      alert('Landing Page URL, Source, and Medium are required.');
      return;
    }
    const payload = {
      client_id: utm?.client_id || null,
      campaign_id: utm?.campaign_id || null,
      source: formData.source,
      medium: formData.medium,
      term: formData.term || null,
      content: formData.content || null,
      full_url: currentFullUrl,
    };
    await onSave(utm.id, payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit UTM: ${utm?.source || '...'}/${utm?.medium || '...'}`}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {clientName && <p className="text-sm">Client: <strong>{clientName}</strong></p>}
        {campaignName && <p className="text-sm">Campaign: <strong>{campaignName}</strong></p>}
        
        <Input
          label="Landing Page URL"
          value={formData.landingPageUrl}
          onChange={e => handleChange('landingPageUrl', e.target.value)}
          placeholder="https://example.com/page"
          required
          fullWidth
        />
        {/* --- CORRECTED --- */}
        <ReactSelect
          label="Source"
          options={sourceOptions}
          value={sourceOptions.find(opt => opt.value === formData.source) || null}
          onChange={option => {
            const value = option ? option.value : '';
            handleChange('source', value);
          }}
          required
          fullWidth
        />
        {/* --- CORRECTED --- */}
        <ReactSelect
          label="Medium"
          options={mediumOptions}
          value={mediumOptions.find(opt => opt.value === formData.medium) || null}
          onChange={option => {
            const value = option ? option.value : '';
            handleChange('medium', value);
          }}
          required
          fullWidth
        />
        <Input
          label="Campaign (utm_campaign)"
          value={formData.campaign}
          onChange={e => handleChange('campaign', e.target.value)}
          placeholder="e.g., summer_sale"
          fullWidth
        />
        <Input
          label="Term (utm_term)"
          value={formData.term}
          onChange={e => handleChange('term', e.target.value)}
          placeholder="e.g., keywords"
          fullWidth
        />
        <Input
          label="Content (utm_content)"
          value={formData.content}
          onChange={e => handleChange('content', e.target.value)}
          placeholder="e.g., logovariant_ad"
          fullWidth
        />

        <div className="mt-4 pt-3 border-t">
            <p className="text-sm font-medium mb-1">Generated URL Preview:</p>
            <div className={`font-mono text-xs p-2 border rounded break-all ${currentFullUrl.startsWith('Error:') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                {currentFullUrl || "Enter details to see preview..."}
            </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white py-3 z-10">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="secondary" icon={isSubmitting ? <Loader2Icon className="animate-spin"/> : <SaveIcon size={16} />} disabled={isSubmitting || currentFullUrl.startsWith('Error:')}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};