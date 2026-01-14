'use client';

import React from 'react';
import { X } from 'lucide-react';
import { CONDITION_REPORT_TEMP_DATA } from '../../../lib/constants/temp';

// Types - Export for use in other components
export interface LineItem {
  text: string;
  price: string;
  priceClass: string;
  itemClass: string | null;
  selected: boolean;
}

export interface SpecialData {
  graphicType?: 'body' | 'interior' | 'glass';
  damageItems?: any[];
  noDamage?: boolean;
  noDamageText?: string;
  tread?: Array<{
    title: string;
    tires: Array<{ position: string; selected: boolean }>;
    price: string;
  }>;
  wheelIssues?: Array<{
    title: string;
    tires: Array<{ position: string; selected: boolean }>;
    price: string;
  }>;
  hasIssues?: boolean;
  issues?: any[];
  noIssuesText?: string;
}

export interface Section {
  type: string;
  dataQa: string;
  title: string;
  subtitle: string | null;
  headerPrice: string | null;
  panelClass: string | null;
  icon: string | null;
  lineItems: LineItem[];
  unselectedItems: string[];
  specialData: SpecialData;
  headerPriceClass: string;
}

export interface ConditionReportData {
  sections: Section[];
  keyValuePairs?: Record<string, string>;
}

interface ConditionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: ConditionReportData;
}

// Helper function to get price color class
const getPriceClass = (priceClass: string): string => {
  if (priceClass.includes('positive')) return 'text-green-400';
  if (priceClass.includes('negative')) return 'text-red-400';
  return 'text-gray-400';
};

// Panel Header Component
const PanelHeader: React.FC<{
  title: string;
  subtitle?: string | null;
  headerPrice?: string | null;
  icon?: string | null;
  panelClass?: string | null;
}> = ({ title, subtitle, headerPrice, icon, panelClass }) => {
  const priceClass = panelClass === 'positive' ? 'text-green-400' : 
                     panelClass === 'negative' ? 'text-red-400' : 
                     'text-gray-400';

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
      <div className="flex items-center gap-3">
        {icon && (
          <img src={icon} alt={title} className="w-6 h-6" />
        )}
        <div className="title-container">
          <div className="title text-white font-semibold text-base">{title}</div>
          {subtitle && (
            <div className="subtitle text-gray-400 text-sm mt-1">{subtitle}</div>
          )}
        </div>
      </div>
      {headerPrice !== null && (
        <div className="formatted-price">
          <span className={`${priceClass} font-semibold`}>
            {headerPrice}
          </span>
        </div>
      )}
    </header>
  );
};

// Standard Line Items Panel
const StandardPanel: React.FC<{
  section: Section;
}> = ({ section }) => {
  const getItemClass = (itemClass: string | null): string => {
    if (!itemClass) return '';
    const classes = itemClass.split(' ');
    let result = 'flex items-center justify-between py-2 px-3 rounded';
    
    if (classes.includes('negative')) {
      result += ' bg-red-900/10 border-l-2 border-red-500';
    } else if (classes.includes('positive')) {
      result += ' bg-green-900/10 border-l-2 border-green-500';
    }
    
    if (classes.includes('not-selected')) {
      result += ' opacity-60';
    }
    
    return result;
  };

  return (
    <div className={`bg-[#1a1d29] rounded-lg shadow-sm border border-gray-700/50 overflow-hidden ${section.panelClass || ''}`}>
      <PanelHeader
        title={section.title}
        subtitle={section.subtitle}
        headerPrice={section.headerPrice}
        icon={section.icon}
        panelClass={section.panelClass}
      />
      <div className="appraisal-panel-content p-6">
        {section.lineItems.length > 0 ? (
          <ul className="space-y-1">
            {section.lineItems.map((item, index) => (
              <li
                key={index}
                className={getItemClass(item.itemClass)}
              >
                <div className="line-item text-white text-sm">
                  <span>{item.text}</span>
                </div>
                <div className="appraisal-panel-adjustment-list-price">
                  <span className={`${getPriceClass(item.priceClass)} text-sm font-medium`}>
                    {item.price}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {section.unselectedItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <div className="text-gray-400 text-xs">
              Not Selected: {section.unselectedItems.join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Damage Panel Component
const DamagePanel: React.FC<{
  section: Section;
}> = ({ section }) => {
  const { specialData } = section;
  const graphicType = specialData.graphicType || 'body';
  const noDamage = specialData.noDamage || false;

  // Placeholder SVG - in production, you'd use the full SVG from the HTML
  const renderGraphic = () => {
    if (graphicType === 'body') {
      return (
        <div className="w-full h-auto max-w-md mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 240 240"
            className="w-full h-auto"
          >
            {/* Simplified body SVG - replace with full version */}
            <rect x="0" y="0" width="240" height="240" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-600" />
            <text x="120" y="120" textAnchor="middle" className="text-gray-400 text-sm">Body Graphic</text>
          </svg>
        </div>
      );
    } else if (graphicType === 'interior') {
      return (
        <div className="w-full h-auto max-w-md mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 240 240"
            className="w-full h-auto"
          >
            {/* Simplified interior SVG - replace with full version */}
            <rect x="0" y="0" width="240" height="240" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-600" />
            <text x="120" y="120" textAnchor="middle" className="text-gray-400 text-sm">Interior Graphic</text>
          </svg>
        </div>
      );
    } else if (graphicType === 'glass') {
      return (
        <div className="w-full h-auto max-w-md mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 240 240"
            className="w-full h-auto"
          >
            {/* Simplified glass SVG - replace with full version */}
            <rect x="0" y="0" width="240" height="240" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-600" />
            <text x="120" y="120" textAnchor="middle" className="text-gray-400 text-sm">Glass Graphic</text>
          </svg>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#1a1d29] rounded-lg shadow-sm border border-gray-700/50 overflow-hidden">
      <PanelHeader
        title={section.title}
        headerPrice={section.headerPrice}
        icon={section.icon}
        panelClass={section.panelClass}
      />
      <div className="appraisal-panel-content p-6">
        <div className="damage-graphic-list-container">
          <div className={`damage-graphic ${noDamage ? 'no-defects' : ''} read-only mb-4`}>
            {renderGraphic()}
          </div>
          <div className="appraisal-panel-damage-list">
            {noDamage ? (
              <div className="no-items text-center py-4 text-gray-400 text-sm">
                {specialData.noDamageText || 'No Damage'}
              </div>
            ) : (
              <div className="space-y-2">
                {specialData.damageItems?.map((damage, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-gray-700/30"
                  >
                    <div className="text-white text-sm">{damage.name || damage}</div>
                    {damage.cost !== undefined && (
                      <span className="text-red-400 font-semibold text-sm">
                        ${damage.cost.toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Tires Panel Component
const TiresPanel: React.FC<{
  section: Section;
}> = ({ section }) => {
  const { specialData } = section;
  const tread = specialData.tread || [];
  const wheelIssues = specialData.wheelIssues || [];

  return (
    <div className="bg-[#1a1d29] rounded-lg shadow-sm border border-gray-700/50 overflow-hidden">
      <PanelHeader
        title={section.title}
        headerPrice={section.headerPrice}
        icon={section.icon}
        panelClass={section.panelClass}
      />
      <div className="appraisal-panel-content p-6">
        {/* Tread Section */}
        <header className="grid grid-cols-6 gap-2 mb-4 pb-2 border-b border-gray-700/50">
          <div className="title text-white font-medium text-sm">Tread</div>
          <div className="tire text-gray-400 text-xs text-center">FL</div>
          <div className="tire text-gray-400 text-xs text-center">FR</div>
          <div className="tire text-gray-400 text-xs text-center">RL</div>
          <div className="tire text-gray-400 text-xs text-center">RR</div>
          <div className="placeholder">&nbsp;</div>
        </header>

        {tread.map((row, index) => (
          <div key={index} className="row grid grid-cols-6 gap-2 items-center mb-2">
            <div className="title text-white text-sm">{row.title}</div>
            {row.tires.map((tire, tireIndex) => (
              <div key={tireIndex} className="circle-container flex justify-center">
                <div className={`circle w-4 h-4 rounded-full border-2 ${
                  tire.selected ? 'border-green-400 bg-green-400/20' : 'border-gray-600'
                }`} />
              </div>
            ))}
            <div className="price text-right">
              <span className={`${getPriceClass('zero')} text-sm`}>{row.price}</span>
            </div>
          </div>
        ))}

        {/* Wheel Issues Section */}
        <header className="grid grid-cols-6 gap-2 mt-6 mb-4 pb-2 border-b border-gray-700/50">
          <div className="title text-white font-medium text-sm">Wheel Issues</div>
        </header>

        {wheelIssues.map((row, index) => {
          const hasSelection = row.tires.some(t => t.selected);
          return (
            <div key={index} className={`row grid grid-cols-6 gap-2 items-center mb-2 ${!hasSelection ? 'no-damage opacity-60' : ''}`}>
              <div className="title text-white text-sm">{row.title}</div>
              {row.tires.map((tire, tireIndex) => (
                <div key={tireIndex} className="circle-container flex justify-center">
                  <div className={`circle w-4 h-4 rounded-full border-2 ${
                    tire.selected ? 'border-red-400 bg-red-400/20' : 'border-gray-600'
                  }`} />
                </div>
              ))}
              <div className="price text-right">
                <span className={`${getPriceClass('zero')} text-sm`}>{row.price}</span>
              </div>
            </div>
          );
        })}

        {section.unselectedItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <div className="text-gray-400 text-xs">
              Not Selected: {section.unselectedItems.join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// OBD Panel Component
const OBDPanel: React.FC<{
  section: Section;
}> = ({ section }) => {
  const { specialData } = section;
  const hasIssues = specialData.hasIssues || false;

  return (
    <div className={`bg-[#1a1d29] rounded-lg shadow-sm border border-gray-700/50 overflow-hidden ${section.panelClass || ''}`}>
      <PanelHeader
        title={section.title}
        panelClass={section.panelClass}
      />
      <div className="appraisal-panel-content p-6">
        {!hasIssues ? (
          <section className="no-issues text-center py-4 text-green-400 font-medium">
            {specialData.noIssuesText || 'No Issues Found'}
          </section>
        ) : (
          <div className="space-y-2">
            {specialData.issues?.map((issue, index) => (
              <div key={index} className="p-3 bg-red-900/20 rounded border border-red-700/30">
                <div className="text-red-400 text-sm">{issue}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Main Panel Renderer
const renderPanel = (section: Section) => {
  switch (section.type) {
    case 'appraisal-damage-panel':
      return <DamagePanel key={section.dataQa} section={section} />;
    case 'appraisal-tires-panel':
      return <TiresPanel key={section.dataQa} section={section} />;
    case 'appraisal-obd-panel':
      return <OBDPanel key={section.dataQa} section={section} />;
    default:
      return <StandardPanel key={section.dataQa} section={section} />;
  }
};

export const ConditionReportModal: React.FC<ConditionReportModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen) return null;

  // Use provided data or fall back to temp data
  const reportData: ConditionReportData = data || CONDITION_REPORT_TEMP_DATA;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="w-full h-full bg-[#0f1117] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 flex-shrink-0">
          <h2 className="text-xl font-semibold text-white">Condition Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-4">
            {reportData.sections.length > 0 ? (
              reportData.sections.map((section) => renderPanel(section))
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-400 text-lg">No condition report data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
