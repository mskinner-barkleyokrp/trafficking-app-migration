import React from 'react'
import { SaveIcon, PlusIcon } from 'lucide-react'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { ReactSelect } from '../components/Select'
export const Settings = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black mb-2">Settings</h1>
        <p className="text-gray-700">
          Configure advertiser profiles, naming conventions, and system
          settings.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg border border-black/10 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Advertiser Profiles</h2>
            <div className="border border-black/10 rounded-lg mb-4">
              <div className="bg-gray-50 px-4 py-3 rounded-t-lg border-b border-black/10 flex justify-between items-center">
                <h3 className="font-medium">Acme Corp</h3>
                <div className="flex space-x-2">
                  <button className="text-sm text-[#fbb832] hover:underline">
                    Edit
                  </button>
                  <button className="text-sm text-red-500 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">
                      Placement Name Template
                    </h4>
                    <div className="text-sm bg-gray-50 p-2 rounded border border-black/10">
                      {'{{client}}_{{campaign}}_{{site}}_{{targeting}}'}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">UTM Structure</h4>
                    <div className="text-sm bg-gray-50 p-2 rounded border border-black/10">
                      {
                        'utm_source={{source}}&utm_medium={{medium}}&utm_campaign={{campaign}}&utm_content={{content}}'
                      }
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">CM360 Instance</h4>
                  <div className="text-sm bg-gray-50 p-2 rounded border border-black/10">
                    acme-corp-dv360-12345
                  </div>
                </div>
              </div>
            </div>
            <div className="border border-black/10 rounded-lg mb-4">
              <div className="bg-gray-50 px-4 py-3 rounded-t-lg border-b border-black/10 flex justify-between items-center">
                <h3 className="font-medium">Globex</h3>
                <div className="flex space-x-2">
                  <button className="text-sm text-[#fbb832] hover:underline">
                    Edit
                  </button>
                  <button className="text-sm text-red-500 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">
                      Placement Name Template
                    </h4>
                    <div className="text-sm bg-gray-50 p-2 rounded border border-black/10">
                      {'{{client}}_{{campaign}}_{{site}}_{{targeting}}'}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">UTM Structure</h4>
                    <div className="text-sm bg-gray-50 p-2 rounded border border-black/10">
                      {
                        'utm_source={{source}}&utm_medium={{medium}}&utm_campaign={{campaign}}'
                      }
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">CM360 Instance</h4>
                  <div className="text-sm bg-gray-50 p-2 rounded border border-black/10">
                    globex-media-cm360-67890
                  </div>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" icon={<PlusIcon size={16} />}>
              Add New Advertiser
            </Button>
          </div>
          <div className="bg-white p-6 rounded-lg border border-black/10 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">CM360 Instances</h2>
            <div className="space-y-4 mb-4">
              <div className="border border-black/10 rounded p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">acme-corp-dv360-12345</h3>
                  <div className="flex space-x-2">
                    <button className="text-sm text-[#fbb832] hover:underline">
                      Edit
                    </button>
                    <button className="text-sm text-red-500 hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Network ID: 12345
                </div>
                <div className="text-sm text-gray-600">
                  API Key: ••••••••••••••••
                </div>
              </div>
              <div className="border border-black/10 rounded p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">globex-media-cm360-67890</h3>
                  <div className="flex space-x-2">
                    <button className="text-sm text-[#fbb832] hover:underline">
                      Edit
                    </button>
                    <button className="text-sm text-red-500 hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Network ID: 67890
                </div>
                <div className="text-sm text-gray-600">
                  API Key: ••••••••••••••••
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" icon={<PlusIcon size={16} />}>
              Add New CM360 Instance
            </Button>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-black/10 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <div>
                  <div className="font-medium">John Doe</div>
                  <div className="text-sm text-gray-500">john@example.com</div>
                </div>
                <div className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Admin
                </div>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <div>
                  <div className="font-medium">Jane Smith</div>
                  <div className="text-sm text-gray-500">jane@example.com</div>
                </div>
                <div className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                  Editor
                </div>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <div>
                  <div className="font-medium">Bob Johnson</div>
                  <div className="text-sm text-gray-500">bob@example.com</div>
                </div>
                <div className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">
                  Viewer
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" icon={<PlusIcon size={16} />}>
              Invite User
            </Button>
          </div>
          <div className="bg-white p-6 rounded-lg border border-black/10 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">System Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-[#fbb832] focus:ring-[#fbb832]"
                    defaultChecked
                  />
                  <span className="text-sm">Enable real-time validation</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-[#fbb832] focus:ring-[#fbb832]"
                    defaultChecked
                  />
                  <span className="text-sm">
                    Auto-generate UTMs from placements
                  </span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-[#fbb832] focus:ring-[#fbb832]"
                  />
                  <span className="text-sm">
                    Enable direct CM360 integration
                  </span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Default Date Format
                </label>
                <ReactSelect
                  options={[
                    {
                      value: 'mm-dd-yyyy',
                      label: 'MM-DD-YYYY',
                    },
                    {
                      value: 'dd-mm-yyyy',
                      label: 'DD-MM-YYYY',
                    },
                    {
                      value: 'yyyy-mm-dd',
                      label: 'YYYY-MM-DD',
                    },
                  ]}
                  defaultValue="yyyy-mm-dd"
                  fullWidth
                />
              </div>
            </div>
            <div className="mt-6">
              <Button variant="primary" size="sm" icon={<SaveIcon size={16} />}>
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
