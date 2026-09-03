'use client';

import React from 'react';
import { initialProfiles } from '@/lib/db/initial-data';
import { UserRole } from '@/types';
import { getRoleDisplayName } from '@/lib/auth/session';
import { Users, Check } from 'lucide-react';

interface RoleSwitcherProps {
  currentUserId: string;
  onSelectUser: (userId: string) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentUserId,
  onSelectUser,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const currentUser = initialProfiles.find((p) => p.id === currentUserId) || initialProfiles[0];

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300';
      case 'PRINCIPAL_OFFICER':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300';
      case 'DEAN':
      case 'HOD':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300';
      case 'LECTURER':
        return 'bg-[#fbf5ef] text-[#8d4a27] border-[#ecdacb]';
      case 'COURSE_REP':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'STUDENT':
        return 'bg-[#fbf5ef] text-[#8d4a27] border-[#ecdacb]';
      case 'NON_ACADEMIC_STAFF':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white shadow-xs hover:bg-slate-50 transition text-xs font-semibold text-slate-800"
        title="Switch Role View"
      >
        <Users className="w-3.5 h-3.5 text-slate-500" />
        <span className="hidden sm:inline text-slate-600">Active Role:</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getRoleBadgeColor(
            currentUser.primaryRole
          )}`}
        >
          {getRoleDisplayName(currentUser.primaryRole)}
        </span>
        <span className="text-slate-400 text-[10px]">▼</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-2 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Switch Perspective
              </p>
              <p className="text-[11px] text-slate-500">
                Explore CUSTECH features across all 8 institutional roles
              </p>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1">
              {initialProfiles.map((p) => {
                const isSelected = p.id === currentUserId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectUser(p.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition ${
                      isSelected
                        ? 'bg-[#fbf5ef] border border-[#ecdacb]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {p.firstName} {p.lastName}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#8d4a27] shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate">{p.email}</p>
                      <span
                        className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[10px] font-medium border ${getRoleBadgeColor(
                          p.primaryRole
                        )}`}
                      >
                        {getRoleDisplayName(p.primaryRole)}
                      </span>
                    </div>
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
