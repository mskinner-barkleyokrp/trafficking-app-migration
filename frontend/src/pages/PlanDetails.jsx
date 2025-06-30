import React, { useState, Fragment } from 'react'
import { useNavigate } from 'react-router'
import {
  SearchIcon,
  FilterIcon,
  ShoppingCartIcon,
  ChevronDownIcon,
} from 'lucide-react'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { ReactSelect } from '../components/Select'
export const PlanDetails = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterCampaign, setFilterCampaign] = useState('')
  const [selectedPlacements, setSelectedPlacements] = useState([])
  const [expandedRows, setExpandedRows] = useState([])
  // Mock data
  const clients = [
    {
      value: '',
      label: 'All Clients',
    },
    {
      value: 'acme',
      label: 'Acme Corp',
    },
    {
      value: 'globex',
      label: 'Globex',
    },
    {
      value: 'initech',
      label: 'Initech',
    },
  ]
  const campaigns = [
    {
      value: '',
      label: 'All Campaigns',
    },
    {
      value: 'summer2023',
      label: 'Summer Sale 2023',
    },
    {
      value: 'productlaunch',
      label: 'Product Launch',
    },
    {
      value: 'brandawareness',
      label: 'Brand Awareness',
    },
  ]
  const mockPlacements = [
    {
      id: 1,
      client: 'Acme Corp',
      campaign: 'Summer Sale 2023',
      name: 'Acme_SummerSale2023_Google_SearchKeywords',
      site: 'Google',
      targeting: 'SearchKeywords',
      rateType: 'CPC',
      dv: true,
      startDate: '2023-06-15',
      endDate: '2023-07-15',
      utms: [
        {
          id: 101,
          source: 'google',
          medium: 'cpc',
          term: 'summer sale',
          content: 'textad1',
          landingPageUrl: 'https://example.com/summer-sale',
        },
      ],
    },
    {
      id: 2,
      client: 'Acme Corp',
      campaign: 'Summer Sale 2023',
      name: 'Acme_SummerSale2023_Facebook_InterestTargeting',
      site: 'Facebook',
      targeting: 'InterestTargeting',
      rateType: 'CPM',
      dv: false,
      startDate: '2023-06-15',
      endDate: '2023-07-15',
      utms: [
        {
          id: 102,
          source: 'facebook',
          medium: 'social',
          content: 'image1',
          landingPageUrl: 'https://example.com/summer-sale',
        },
      ],
    },
    {
      id: 3,
      client: 'Globex',
      campaign: 'Product Launch',
      name: 'Globex_ProductLaunch_Instagram_Story',
      site: 'Instagram',
      targeting: 'Story',
      rateType: 'CPM',
      dv: true,
      startDate: '2023-06-20',
      endDate: '2023-07-20',
      utms: [
        {
          id: 103,
          source: 'instagram',
          medium: 'social',
          content: 'story1',
          landingPageUrl: 'https://example.com/product-launch',
        },
        {
          id: 104,
          source: 'instagram',
          medium: 'social',
          content: 'story2',
          landingPageUrl: 'https://example.com/product-features',
        },
      ],
    },
  ]
  // Filter placements based on search and filters
  const filteredPlacements = mockPlacements.filter((placement) => {
    const matchesSearch =
      searchTerm === '' ||
      placement.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      placement.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
      placement.targeting.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClient =
      filterClient === '' ||
      placement.client.includes(
        clients.find((c) => c.value === filterClient)?.label || '',
      )
    const matchesCampaign =
      filterCampaign === '' ||
      placement.campaign.includes(
        campaigns.find((c) => c.value === filterCampaign)?.label || '',
      )
    return matchesSearch && matchesClient && matchesCampaign
  })
  const toggleSelectPlacement = (id) => {
    if (selectedPlacements.includes(id)) {
      setSelectedPlacements(
        selectedPlacements.filter((placementId) => placementId !== id),
      )
    } else {
      setSelectedPlacements([...selectedPlacements, id])
    }
  }
  const toggleExpandRow = (id) => {
    if (expandedRows.includes(id)) {
      setExpandedRows(expandedRows.filter((rowId) => rowId !== id))
    } else {
      setExpandedRows([...expandedRows, id])
    }
  }
  const handleCheckout = () => {
    // In a real app, you might store selected placements in context/state
    // before navigating to checkout
    navigate('/checkout')
  }
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black mb-2">Plan Details</h1>
        <p className="text-gray-700">
          View and manage campaign placements and associated UTMs.
        </p>
      </div>
      <div className="bg-white p-6 rounded-lg border border-black/10 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <SearchIcon
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <Input
              type="text"
              placeholder="Search placements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              fullWidth
            />
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <ReactSelect
              options={clients}
              value={filterClient}
              onChange={option => {
                const value = option ? option.value : '';
                setFilterClient(value);
              }}
              placeholder="Filter by client"
            />
            <ReactSelect
              options={campaigns}
              value={filterCampaign}
              onChange={option => {
                const value = option ? option.value : '';
                setFilterCampaign(value);
              }}
              placeholder="Filter by campaign"
            />
            <Button
              variant="outline"
              size="sm"
              icon={<div size={16} />}
              onClick={() => {
                setSearchTerm('')
                setFilterClient('')
                setFilterCampaign('')
              }}
            >
              Reset
            </Button>
          </div>
        </div>
        {selectedPlacements.length > 0 && (
          <div className="mb-4 p-3 bg-[#fff8ee] border border-[#fbb832]/30 rounded-md flex justify-between items-center">
            <div>
              <span className="text-sm font-medium">
                {selectedPlacements.length} placement(s) selected
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<ShoppingCartIcon size={16} />}
              onClick={handleCheckout}
            >
              Proceed to Checkout
            </Button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/10">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-[#fbb832] focus:ring-[#fbb832]"
                    checked={
                      selectedPlacements.length === filteredPlacements.length &&
                      filteredPlacements.length > 0
                    }
                    onChange={() => {
                      if (
                        selectedPlacements.length === filteredPlacements.length
                      ) {
                        setSelectedPlacements([])
                      } else {
                        setSelectedPlacements(
                          filteredPlacements.map((p) => p.id),
                        )
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Placement Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DV
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  UTMs
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-black/10">
              {filteredPlacements.length > 0 ? (
                filteredPlacements.map((placement) => (
                  <Fragment key={placement.id}>
                    <tr
                      className={`hover:bg-[#fff8ee] ${expandedRows.includes(placement.id) ? 'bg-[#fff8ee]/50' : ''}`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-[#fbb832] focus:ring-[#fbb832]"
                          checked={selectedPlacements.includes(placement.id)}
                          onChange={() => toggleSelectPlacement(placement.id)}
                        />
                      </td>
                      <td className="px-4 py-4 font-medium">
                        {placement.name}
                      </td>
                      <td className="px-4 py-4">{placement.client}</td>
                      <td className="px-4 py-4">{placement.campaign}</td>
                      <td className="px-4 py-4">{placement.site}</td>
                      <td className="px-4 py-4">{placement.rateType}</td>
                      <td className="px-4 py-4">
                        {placement.dv ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <div>{placement.startDate}</div>
                          <div>{placement.endDate}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => toggleExpandRow(placement.id)}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <ChevronDownIcon
                            size={18}
                            className={`transform transition-transform ${expandedRows.includes(placement.id) ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </td>
                    </tr>
                    {expandedRows.includes(placement.id) && (
                      <tr className="bg-[#fff8ee]/30">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="text-sm">
                            <h4 className="font-medium mb-2">
                              UTM Parameters ({placement.utms.length})
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-black/10 border border-black/10 rounded">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Source
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Medium
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Term
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Content
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Landing Page URL
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-black/10">
                                  {placement.utms.map((utm) => (
                                    <tr
                                      key={utm.id}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="px-3 py-2">
                                        {utm.source}
                                      </td>
                                      <td className="px-3 py-2">
                                        {utm.medium}
                                      </td>
                                      <td className="px-3 py-2">
                                        {utm.term || '-'}
                                      </td>
                                      <td className="px-3 py-2">
                                        {utm.content || '-'}
                                      </td>
                                      <td
                                        className="px-3 py-2 truncate max-w-xs"
                                        title={utm.landingPageUrl}
                                      >
                                        <a
                                          href="#"
                                          className="text-blue-600 hover:underline"
                                        >
                                          {utm.landingPageUrl}
                                        </a>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No placements found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
