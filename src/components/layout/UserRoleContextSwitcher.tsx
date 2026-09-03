'use client';

import React from 'react';
import { UserProfile, UserRole } from '@/types';
import { switchActiveRole } from '@/lib/auth/auth-service';
import { getRoleDisplayName, getViewAsLabel } from '@/lib/auth/session';
import { Check, ChevronDown, Layers, ArrowLeftRight } from 'lucide-react';

interface UserRoleContextSwitcherProps {
  user: UserProfile;
  activeRole: UserRole;
  onRoleSwitched?: (newRole: UserRole) => void;
}

export const UserRoleContextSwitcher: React.FC<UserRoleContextSwitcherProps> = ({
  user,
  activeRole,
  onRoleSwitched,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const assignedRoles = user.assignedRoles || [user.primaryRole];
  const hasMultipleRoles = assignedRoles.length > 1;

  const handleSelectRole = (role: UserRole) => {
    if (role === activeRole) {
      setIsOpen(false);
      return;
    }
    const res = switchActiveRole(role);
    if (res.success) {
      setIsOpen(false);
      if (onRoleSwitched) onRoleSwitched(role);
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'PRINCIPAL_OFFICER':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'DEAN':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'HOD':
        return 'bg-[#fbf5ef] text-[#8d4a27] border-[#ecdacb]';
      case 'LECTURER':
        return 'bg-[#fbf5ef] text-[#8d4a27] border-[#ecdacb]';
      case 'COURSE_REP':
      case 'ASSISTANT_COURSE_REP':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'DEPARTMENT_REP':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'STUDENT':
        return 'bg-[#fbf5ef] text-[#8d4a27] border-[#ecdacb]';
      case 'NON_ACADEMIC_STAFF':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // If user only has one single role, show simple non-clickable badge
  if (!hasMultipleRoles) {
    return (
      <div className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-200 bg-white shadow-xs text-[10px] sm:text-xs font-semibold text-slate-700">
        <span className="text-slate-400 text-[10px] hidden sm:inline">Role:</span>
        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border ${getRoleBadgeClass(activeRole)} truncate max-w-[110px] sm:max-w-none`}>
          {getRoleDisplayName(activeRole)}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-[#ecdacb] bg-[#fbf5ef] shadow-xs hover:bg-[#f4e8dc] transition text-[11px] sm:text-xs font-bold text-slate-800 shrink-0"
        title="Switch between your assigned positions"
      >
        <ArrowLeftRight className="w-3.5 h-3.5 text-[#8d4a27] shrink-0" />
        <span className="text-[#8d4a27] hidden md:inline">Viewing as:</span>
        <span
          className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border ${getRoleBadgeClass(
            activeRole
          )} truncate max-w-[90px] sm:max-w-none`}
        >
          {getRoleDisplayName(activeRole)}
        </span>
        <ChevronDown className="w-3 h-3 text-[#8d4a27] shrink-0" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-2 overflow-hidden animate-fadeIn">
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-[#8d4a27]" />
                <span>Switch Your Perspective</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Switch workspaces without logging out
              </p>
            </div>

            <div className="space-y-1">
              {assignedRoles.map((role) => {
                const isSelected = role === activeRole;
                return (
                  <button
                    key={role}
                    onClick={() => handleSelectRole(role)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition ${
                      isSelected
                        ? 'bg-[#fbf5ef] border border-[#ecdacb]'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">
                        {getViewAsLabel(role)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {getRoleDisplayName(role)}
                      </span>
                    </div>

                    {isSelected ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8d4a27] text-white text-[10px] font-bold">
                        <Check className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-[#8d4a27] hover:underline">
                        Switch ➔
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
