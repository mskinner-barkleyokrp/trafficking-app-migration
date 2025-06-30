// src/pages/TraffickingQueue.jsx
import React, { useState, useMemo } from 'react';
import { ChevronDownIcon, ChevronUpIcon, Edit2Icon, AlertCircleIcon, CheckCircleIcon, ClockIcon, SearchIcon, ListChecksIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTraffickingRequests } from '../hooks/useTraffickingRequests';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Button } from '../components/Button';
import { ReactSelect } from '../components/Select'; // Corrected Import
import { Input } from '../components/Input';

// Mock users for assignment dropdown - replace with actual user fetching logic if needed
const mockAdOpsUsers = [
    { id: null, name: 'Unassigned' },
    { id: 'adops1_uuid', name: 'AdOps User 1' },
    { id: 'adops2_uuid', name: 'AdOps User 2' },
];


const StatusBadge = ({ status }) => {
    let bgColor, textColor, Icon;
    switch (status?.toLowerCase()) {
        case 'pending':
            bgColor = 'bg-yellow-100'; textColor = 'text-yellow-800'; Icon = ClockIcon;
            break;
        case 'in progress':
        case 'assigned':
            bgColor = 'bg-blue-100'; textColor = 'text-blue-800'; Icon = Edit2Icon;
            break;
        case 'completed':
            bgColor = 'bg-green-100'; textColor = 'text-green-800'; Icon = CheckCircleIcon;
            break;
        case 'on hold':
            bgColor = 'bg-red-100'; textColor = 'text-red-800'; Icon = AlertCircleIcon;
            break;
        default:
            bgColor = 'bg-gray-100'; textColor = 'text-gray-800'; Icon = AlertCircleIcon;
    }
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
            {Icon && <Icon size={14} className="mr-1.5" />}
            {status || 'Unknown'}
        </span>
    );
};


export const TraffickingQueue = () => {
    const { user } = useAuth();
    const { requests, loading, error, updateRequest, refetch } = useTraffickingRequests();

    const [expandedRequests, setExpandedRequests] = useState({});
    const [editingRequest, setEditingRequest] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const [assignedTo, setAssignedTo] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');


    const toggleExpandRequest = (requestId) => {
        setExpandedRequests(prev => ({ ...prev, [requestId]: !prev[requestId] }));
    };

    const handleStartEdit = (request) => {
        setEditingRequest(request.id);
        setNewStatus(request.status);
        setAssignedTo(request.assigned_to || null);
    };

    const handleCancelEdit = () => {
        setEditingRequest(null);
        setNewStatus('');
        setAssignedTo(null);
    };

    const handleSaveEdit = async (requestPgId) => {
        if (!editingRequest || !requestPgId) return;
        try {
            await updateRequest(requestPgId, { status: newStatus, assigned_to: assignedTo });
            refetch();
            handleCancelEdit();
        } catch (err) {
            console.error("Failed to update request:", err);
            alert("Failed to update request: " + err.message);
        }
    };
    
    const filteredRequests = useMemo(() => {
        return requests
            .filter(req => {
                const lowerSearchTerm = searchTerm.toLowerCase();
                const trafficDetails = req.request_details?.traffic || [];
                const matchesSearch = (
                    req.client_name?.toLowerCase().includes(lowerSearchTerm) ||
                    req.campaign_name?.toLowerCase().includes(lowerSearchTerm) ||
                    req.submitted_by_email?.toLowerCase().includes(lowerSearchTerm) ||
                    (trafficDetails.some(t => t.placementName?.toLowerCase().includes(lowerSearchTerm)))
                );
                const matchesStatus = !statusFilter || req.status?.toLowerCase() === statusFilter.toLowerCase();
                return matchesSearch && matchesStatus;
            });
    }, [requests, searchTerm, statusFilter]);


    const statusOptionsForFilter = useMemo(() => [
        { value: '', label: 'All Statuses' },
        { value: 'pending', label: 'Pending' },
        { value: 'assigned', label: 'Assigned' },
        { value: 'in progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'on hold', label: 'On Hold' },
    ], []);
    
    const adOpsUserOptions = useMemo(() => mockAdOpsUsers.map(u => ({value: u.id, label: u.name})), []);


    if (loading) return <LoadingSpinner />;
    if (error) return <div className="text-red-500 p-4">Error loading requests: {error.message}</div>;

    return (
        <div className="max-w-full mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-black mb-2">Trafficking Queue</h1>
                <p className="text-gray-700">View and manage submitted trafficking requests.</p>
            </div>

            <div className="mb-6 p-4 bg-white rounded-lg border shadow-sm flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-grow w-full sm:w-auto relative">
                    <SearchIcon size={18} className="absolute left-3 top-5 transform -translate-y-1/2 text-gray-400"/>
                    <Input
                        type="text"
                        placeholder="Search by Client, Campaign, Submitter..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 !mb-0"
                        fullWidth
                    />
                </div>
                {/* --- CORRECTED --- */}
                <ReactSelect
                    options={statusOptionsForFilter}
                    value={statusOptionsForFilter.find(opt => opt.value === statusFilter)}
                    onChange={option => {
                        const value = option ? option.value : '';
                        setStatusFilter(value);
                    }}
                    className="w-full sm:w-48"
                />
                 <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter(''); }} className="w-full sm:w-auto">
                    Clear Filters
                </Button>
            </div>


            {filteredRequests.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    <ListChecksIcon size={48} className="mx-auto mb-4 opacity-50" />
                    No trafficking requests found{searchTerm || statusFilter ? ' matching your criteria.' : '.'}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRequests.map((request) => (
                        <div key={request.id} className="bg-white rounded-lg border border-black/10 shadow-sm">
                            <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                <div className="flex-grow mb-3 sm:mb-0">
                                    <h2 className="text-lg font-semibold text-[#ff501c] mb-1">{request.client_name}</h2>
                                    <p className="text-sm text-gray-600">Campaign: {request.campaign_name}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Submitted: {new Date(request.submitted_at).toLocaleDateString()} by {request.submitted_by_email}
                                        {request.due_date && ` | Due: ${new Date(request.due_date).toLocaleDateString()}`}
                                    </p>
                                </div>
                                <div className="flex flex-col items-start sm:items-end space-y-2 sm:space-y-0 sm:space-x-3 sm:flex-row">
                                     <StatusBadge status={request.status} />
                                    {user.role === 'adops' && editingRequest !== request.id && (
                                        <Button variant="outline" size="sm" icon={<Edit2Icon size={14} />} onClick={() => handleStartEdit(request)}>
                                            Update
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => toggleExpandRequest(request.id)} className="w-full sm:w-auto">
                                        {expandedRequests[request.id] ? 'Hide Details' : 'Show Details'}
                                        {expandedRequests[request.id] ? <ChevronUpIcon size={16} className="ml-1.5" /> : <ChevronDownIcon size={16} className="ml-1.5" />}
                                    </Button>
                                </div>
                            </div>

                            {editingRequest === request.id && user.role === 'adops' && (
                                <div className="p-4 border-t bg-gray-50 space-y-3">
                                    {/* --- CORRECTED --- */}
                                    <ReactSelect 
                                        label="New Status" 
                                        options={statusOptionsForFilter.filter(s => s.value !== '')} 
                                        value={statusOptionsForFilter.find(opt => opt.value === newStatus)}
                                        onChange={option => {
                                            const value = option ? option.value : '';
                                            setNewStatus(value);
                                          }} 
                                        fullWidth 
                                    />
                                    {/* --- CORRECTED --- */}
                                    <ReactSelect 
                                        label="Assign To" 
                                        options={adOpsUserOptions} 
                                        value={adOpsUserOptions.find(opt => opt.value === assignedTo)}
                                        onChange={option => {
                                            // 'assignedTo' can be null, which is what we get from the 'Unassigned' option
                                            setAssignedTo(option ? option.value : null)
                                        }} 
                                        fullWidth 
                                    />
                                    <div className="flex justify-end space-x-2">
                                        <Button variant="outline" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                                        <Button variant="secondary" size="sm" onClick={() => handleSaveEdit(request.id)}>Save Update</Button>
                                    </div>
                                </div>
                            )}

                            {expandedRequests[request.id] && (
                                <div className="p-4 border-t">
                                    {request.notes && <p className="text-sm mb-3"><strong>Notes:</strong> {request.notes}</p>}
                                    <h3 className="text-md font-semibold mb-2">Placement Details:</h3>
                                    {request.request_details?.traffic && request.request_details.traffic.length > 0 ? (
                                        <div className="space-y-3">
                                            {request.request_details.traffic.map((item, index) => (
                                                <div key={index} className="p-3 border rounded bg-gray-50/50">
                                                    <p className="font-medium text-sm">{item.placementName}</p>
                                                    {item.creativeAssignments && item.creativeAssignments.length > 0 && (
                                                        <div className="mt-2 pl-4 border-l-2 border-gray-200">
                                                            {item.creativeAssignments.map((creative, cIndex) => (
                                                                <div key={cIndex} className="text-xs py-1">
                                                                    <p><strong>Creative:</strong> {creative.creativeName}</p>

                                                                    <p><strong>Dates:</strong> {creative.startDate} to {creative.endDate}</p>
                                                                    <p className="truncate"><strong>Landing Page:</strong> <a href={creative.landingPage} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{creative.landingPage}</a></p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-sm text-gray-500">No placement items in this request.</p>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};