
import React from 'react';
import { Person, Site } from '../types';
import { PersonDetailContent } from './PersonDetailContent';

interface PersonDetailModalProps {
  person: Person;
  onClose: () => void;
  onSiteSelect: (site: Site) => void;
  sites: Site[];
}

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({ person, onClose, onSiteSelect, sites }) => {
  
  const findSiteById = (id: string | number): Site | undefined => {
      return sites.find(s => String(s.site_id) === String(id));
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-0 md:p-4 animate-fade-in"
      onClick={onClose}
    >
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
      <div 
        className="bg-slate-800 md:rounded-lg shadow-xl w-full h-full md:h-auto md:max-w-3xl md:max-h-[90vh] flex flex-col text-slate-200 border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-2xl font-bold text-cyan-400">{person.full_name}</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-600"
            aria-label="Đóng"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="p-6 overflow-y-auto">
          <PersonDetailContent 
            personId={person.person_id} 
            onSiteSelect={(siteId) => {
                const site = findSiteById(siteId);
                if (site) {
                    onSiteSelect(site);
                }
            }}
          />
        </div>
      </div>
    </div>
  );
};
