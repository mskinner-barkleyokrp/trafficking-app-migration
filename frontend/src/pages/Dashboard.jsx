import React from 'react'
import { Link } from 'react-router'
import {
  FileSpreadsheetIcon,
  LinkIcon,
  ClipboardListIcon,
  ArrowRightIcon,
  ShoppingCartIcon,
} from 'lucide-react'
import { Button } from '../components/Button'
import { useTraffickingRequests } from '../hooks/useTraffickingRequests'
import { usePlacements } from '../hooks/usePlacements'

export const Dashboard = () => {
  const { requests = [], loading: requestsLoading } = useTraffickingRequests()
  const { placements = [], loading: placementsLoading } = usePlacements()

  // Get recent placements (last 5) - with null safety
  const recentPlacements = (placements || [])
    .filter(placement => placement && placement.dt_created) // Filter out null/undefined items
    .sort((a, b) => new Date(b.dt_created) - new Date(a.dt_created))
    .slice(0, 5)

  // Get pending requests - with null safety
  const pendingRequests = (requests || [])
    .filter(req => req && req.status === 'pending')
    .slice(0, 5)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-4">
          Home
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Link
          to="/placements"
          className="bg-white p-6 rounded-lg border border-black/10 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-[#fbb832]/20 rounded-full flex items-center justify-center mr-4">
              <FileSpreadsheetIcon size={24} className="text-[#fbb832]" />
            </div>
            <h2 className="text-xl font-semibold">Placement Builder</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Create and manage advertising placements with real-time validation.
          </p>
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowRightIcon size={16} />}
            >
              Get Started
            </Button>
          </div>
        </Link>

        <Link
          to="/utms"
          className="bg-white p-6 rounded-lg border border-black/10 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-[#fbb832]/20 rounded-full flex items-center justify-center mr-4">
              <LinkIcon size={24} className="text-[#fbb832]" />
            </div>
            <h2 className="text-xl font-semibold">UTM Builder</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Generate and manage UTM parameters for campaign tracking.
          </p>
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowRightIcon size={16} />}
            >
              Get Started
            </Button>
          </div>
        </Link>

        <Link
          to="/plan-details"
          className="bg-white p-6 rounded-lg border border-black/10 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-[#fbb832]/20 rounded-full flex items-center justify-center mr-4">
              <ShoppingCartIcon size={24} className="text-[#fbb832]" />
            </div>
            <h2 className="text-xl font-semibold">Checkout Placements</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Checkout your placements and manage your plan details.
          </p>
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowRightIcon size={16} />}
            >
              Checkout
            </Button>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-black/10">
          <h2 className="text-xl font-semibold mb-4">Recent Placements</h2>
          {placementsLoading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded"></div>
              ))}
            </div>
          ) : recentPlacements.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {recentPlacements.map((placement) => (
                <div
                  key={placement.id}
                  className="py-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{placement.client_name || 'Unknown Client'}</p>
                    <p className="text-sm text-gray-600 truncate max-w-xs">
                      {placement.name || 'Unnamed Placement'}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {placement.dt_created ? new Date(placement.dt_created).toLocaleDateString() : 'No date'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No placements created yet.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg border border-black/10">
          <h2 className="text-xl font-semibold mb-4">Pending Requests</h2>
          {requestsLoading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded"></div>
              ))}
            </div>
          ) : pendingRequests.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {pendingRequests.map((request) => (
                <div key={request.id} className="py-3">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-medium">{request.client_name || 'Unknown Client'}</p>
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                      {request.status || 'pending'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {request.campaign_name || 'Unknown Campaign'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {request.submitted_at ? new Date(request.submitted_at).toLocaleDateString() : 'No date'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No pending requests.</p>
          )}
        </div>
      </div>
    </div>
  )
}