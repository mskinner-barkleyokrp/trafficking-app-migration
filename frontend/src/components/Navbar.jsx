// src/components/Navbar.jsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboardIcon,
  FileSpreadsheetIcon,
  LinkIcon,
  ClipboardListIcon,
  ShoppingCartIcon,
  SettingsIcon,
  MenuIcon,
  XIcon,
  UsersIcon,
  LogOutIcon,
  UserCircleIcon,
  ListChecksIcon, // New Icon for Trafficking Queue
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import M1MLogo from './M1MLogo.png'; // Assuming you have a logo component or image

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboardIcon size={20} /> },
    { path: '/clients-campaigns', label: 'Clients & Campaigns', icon: <UsersIcon size={20} /> },
    { path: '/placements', label: 'Placement Builder', icon: <FileSpreadsheetIcon size={20} /> },
    { path: '/utms', label: 'UTM Builder', icon: <LinkIcon size={20} /> },
    { path: '/checkout', label: 'Checkout', icon: <ShoppingCartIcon size={20} /> },
    { path: '/trafficking-queue', label: 'Trafficking Queue', icon: <ListChecksIcon size={20} /> }, // New Item
    { path: '/templates', label: 'Templates', icon: <FileSpreadsheetIcon size={20} /> },
  ];

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const toggleUserMenu = () => setIsUserMenuOpen(!isUserMenuOpen);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    navigate('/login');
  };

  // ... (rest of the Navbar component remains the same as the previous version) ...
  // Make sure to copy the full Navbar code from the previous response if you haven't
  // This snippet only shows the navItems update and icon import.

  return (
    <nav className="bg-white border-b border-black/10 sticky top-0 z-40">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side: Logo and Nav Items */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-[#ff501c]">
                <img src={M1MLogo} alt="M1M Logo" className="h-12 w-auto" />
              </Link>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-1 lg:space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-2 py-2 lg:px-3 rounded-md text-sm font-medium transition-colors duration-150 ${
                    location.pathname === item.path
                      ? 'bg-[#fbb832] text-black'
                      : 'text-black hover:bg-[#fff8ee]'
                  }`}
                >
                  <span className="mr-1.5 lg:mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side: User Info/Menu and Mobile Menu Button */}
          <div className="flex items-center">
            {/* Desktop User Menu */}
            <div className="hidden md:ml-4 md:flex md:items-center">
              {user && (
                <div className="relative">
                  <button
                    onClick={toggleUserMenu}
                    className="flex items-center text-sm rounded-full focus:outline-none hover:bg-gray-100 p-2 transition-colors"
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                  >
                    <span className="sr-only">Open user menu</span>
                    <UserCircleIcon className="h-7 w-7 text-gray-600" />
                    <span className="ml-2 text-sm text-gray-700 hidden lg:block">{user.email}</span>
                  </button>
                  {isUserMenuOpen && (
                    <div
                      className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu-button"
                    >
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        Signed in as <br/>
                        <strong className="truncate">{user.firstName ? `${user.firstName} ${user.lastName}` : user.email}</strong>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        role="menuitem"
                      >
                        <LogOutIcon size={16} className="mr-2 text-gray-500" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-black hover:bg-gray-100 focus:outline-none"
                aria-controls="mobile-menu"
                aria-expanded={isMobileMenuOpen}
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <XIcon className="block h-6 w-6" />
                ) : (
                  <MenuIcon className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === item.path
                    ? 'bg-[#fbb832] text-black'
                    : 'text-black hover:bg-[#fff8ee]'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
          {user && (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-5">
                <UserCircleIcon className="h-8 w-8 text-gray-600" />
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800 truncate">
                    {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}
                    </div>
                  <div className="text-sm font-medium text-gray-500 truncate">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center px-3 py-2 rounded-md text-base font-medium text-black hover:bg-[#fff8ee]"
                >
                  <LogOutIcon size={20} className="mr-2 text-gray-500" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};