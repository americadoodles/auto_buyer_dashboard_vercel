'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ApiService } from '../../../lib/services/api';
import { CONDITION_REPORT_TEMP_DATA } from '../../../lib/constants/temp';
import TiresIcon from '../../../assets/svg/tires';
import GlassIcon from '../../../assets/svg/glass';
import BodyIcon from '../../../assets/svg/body';
import InteriorIcon from '../../../assets/svg/interior';
import MechanicalIcon from '../../../assets/svg/mechanical';
import AftermarketIcon from '../../../assets/svg/aftermarket';
import OtherIcon from '../../../assets/svg/other';
import { convertAngularSvgToReact, getSvgHtml } from '../../../lib/utils/svgConverter';
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
  svgImage?: string;
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
  vin?: string;
}

// Helper function to get price color class
const getPriceClass = (priceClass: string): string => {
  if (priceClass.includes('positive')) return 'text-green-600 dark:text-green-400';
  if (priceClass.includes('negative')) return 'text-red-600 dark:text-red-400';
  return 'text-gray-600 dark:text-gray-400';
};

// Formatted Price Component
const FormattedPrice: React.FC<{ price: string; className?: string; priceClass?: string }> = ({ price, className = '', priceClass = '' }) => {
  let finalPriceClass = priceClass;
  if (!finalPriceClass) {
    finalPriceClass = price.includes('+') ? 'text-green-600 dark:text-green-400' : 
                     price.includes('-') ? 'text-red-600 dark:text-red-400' : 
                     'text-gray-600 dark:text-gray-400';
  } else {
    // Map priceClass string to Tailwind classes
    if (finalPriceClass.includes('positive')) finalPriceClass = 'text-green-600 dark:text-green-400';
    else if (finalPriceClass.includes('negative')) finalPriceClass = 'text-red-600 dark:text-red-400';
    else finalPriceClass = 'text-gray-600 dark:text-gray-400';
  }
  
  return (
    <span className={`${finalPriceClass} ${className}`}>
      {price}
    </span>
  );
};

// Panel Header Component
const PanelHeader: React.FC<{
  title: string;
  subtitle?: string | null;
  headerPrice?: string | null;
  icon?: string | null;
  panelClass?: string | null;
}> = ({ title, subtitle, headerPrice, icon, panelClass }) => {
  const priceClass = panelClass === 'positive' ? 'text-green-600 dark:text-green-400' : 
                     panelClass === 'negative' ? 'text-red-600 dark:text-red-400' : 
                     'text-gray-600 dark:text-gray-400';

  // Get the appropriate icon component based on title
  const getIconComponent = () => {
    switch (title) {
      case 'Tire/Wheel':
        return <TiresIcon />;
      case 'Glass Damage':
        return <GlassIcon />;
      case 'Body Damage':
        return <BodyIcon />;
      case 'Interior Damage':
        return <InteriorIcon />;
      case 'Mechanical':
      case 'Warning Lights':
        return <MechanicalIcon />;
      case 'Aftermarket Modifications':
        return <AftermarketIcon />;
      case 'Disclosures':
        return <OtherIcon />;
      default:
        // Fallback to image if icon path is provided
        return icon ? <img src={icon} alt={title} className="w-6 h-6" /> : null;
    }
  };

  return (
    <header className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700/50">
      <div className="flex items-center gap-3">
        {getIconComponent()}
        <div className="title-container">
          <div className="title text-black dark:text-white font-semibold text-base">{title}</div>
          {subtitle && (
            <div className="subtitle text-black dark:text-gray-400 text-sm mt-1">{subtitle}</div>
          )}
        </div>
      </div>
      {headerPrice !== null && headerPrice !== undefined && (
        <div className="formatted-price">
          <FormattedPrice price={headerPrice} className="font-semibold" />
        </div>
      )}
    </header>
  );
};

// Standard Line Items Panel
const StandardPanel: React.FC<{
  section: Section;
}> = ({ section }) => {
  return (
    <div className={`appraisal-panel bg-white dark:bg-[#1a1d29] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700/50 overflow-hidden ${section.panelClass || ''}`}>
      <PanelHeader
        title={section.title}
        subtitle={section.subtitle}
        headerPrice={section.headerPrice}
        icon={section.icon}
        panelClass={section.panelClass}
      />
      <div className="appraisal-panel-content p-3">
        {section.lineItems.length > 0 ? (
          <div className="appraisal-panel-adjustment-list">
            <ul className="space-y-0">
              {section.lineItems.map((item, index) => (
                <li
                  key={index}
                  className={`${item.itemClass || ''} flex items-center justify-between px-2 leading-none ${
                    item.itemClass?.includes('negative') ? 'bg-red-50 dark:bg-red-900/10 border-l-2 border-red-500' : ''
                  } ${
                    item.itemClass?.includes('positive') ? 'bg-green-50 dark:bg-green-900/10 border-l-2 border-green-500' : ''
                  } ${
                    item.itemClass?.includes('not-selected') ? 'opacity-60' : ''
                  }`}
                >
                  <div className="line-item-with-notes">
                    <div className="line-item text-black dark:text-white text-sm">
                      {item.text.includes('<span>') ? (
                        <span dangerouslySetInnerHTML={{ __html: item.text }} />
                      ) : (
                        <span>{item.text}</span>
                      )}
                    </div>
                  </div>
                  <div className="appraisal-panel-adjustment-list-price">
                    <FormattedPrice price={item.price} priceClass={item.priceClass || ''} className="text-sm" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// Body Damage SVG Component - Example of Angular SVG string

const BodyDamageGraphic: React.FC<{ noDamage: boolean; svgImage?: string }> = ({ noDamage, svgImage }) => {
  if (!svgImage) return null;
  const svgToUse = svgImage;
  return (
    <div className="w-full h-auto max-w-md mx-auto bg-white">
      {/* Example usage: Using dangerouslySetInnerHTML with converted SVG */}
      <div dangerouslySetInnerHTML={getSvgHtml(svgToUse)} />
      
      {/* <div dangerouslySetInnerHTML={{ __html: convertedBodySvg }} /> */}
    </div>
  );
};

const InteriorDamageGraphic: React.FC<{ noDamage: boolean; svgImage?: string }> = ({ noDamage, svgImage }) => {
  if (!svgImage) return null;
  const svgToUse = svgImage;
  return (
    <div className="w-full h-auto max-w-md mx-auto bg-white">
      <div dangerouslySetInnerHTML={getSvgHtml(svgToUse)} />
    </div>
  );
};


const GlassDamageGraphic: React.FC<{ noDamage: boolean; svgImage?: string }> = ({ noDamage, svgImage }) => {
  if (!svgImage) return null;
  const svgToUse = svgImage;
  return (
    <div className="w-full h-auto max-w-md mx-auto bg-white">
      <div dangerouslySetInnerHTML={getSvgHtml(svgToUse)} />
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

  const renderGraphic = () => {
    const svgImage = specialData.svgImage;
    if (graphicType === 'body') {
      return <BodyDamageGraphic noDamage={noDamage} svgImage={svgImage} />;
    } else if (graphicType === 'interior') {
      return <InteriorDamageGraphic noDamage={noDamage} svgImage={svgImage} />;
    } else if (graphicType === 'glass') {
      return <GlassDamageGraphic noDamage={noDamage} svgImage={svgImage} />;
    }
    return null;
  };

  return (
    <div className="appraisal-damage-panel">
      <div className={`appraisal-panel bg-white dark:bg-[#1a1d29] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700/50 overflow-hidden`}>
        <PanelHeader
          title={section.title}
          headerPrice={section.headerPrice}
          icon={section.icon}
          panelClass={section.panelClass}
        />
        <div className="appraisal-panel-content p-3">
          <div className="damage-graphic-list-container">
            <div className={`damage-graphic ${noDamage ? 'no-defects' : ''} read-only`}>
              {renderGraphic()}
            </div>
            <div className="appraisal-panel-damage-list">
              {noDamage ? (
                <div className="no-items text-center py-1 text-black dark:text-gray-400 text-sm">
                  {specialData.noDamageText || 'No Damage'}
                </div>
              ) : (
                <div className="appraisal-panel-adjustment-list">
                  <div className="space-y-0">
                    {specialData.damageItems?.map((damage, index) => {
                      const damageText = typeof damage === 'string' ? damage : damage.issue || '';
                      const damagePrice = typeof damage === 'object' && damage.price ? damage.price : '';
                      const priceType = typeof damage === 'object' && damage.priceType ? damage.priceType : '';
                      const priceClass = priceType === 'negative' ? 'negative' : priceType === 'positive' ? 'positive' : '';
                      const itemClass = priceType === 'negative' ? 'negative' : priceType === 'positive' ? 'positive' : '';
                      
                      return (
                        <div
                          key={index}
                          className={`${itemClass} flex items-center justify-between px-2 leading-none ${
                            itemClass?.includes('negative') ? 'bg-red-50 dark:bg-red-900/10 border-l-2 border-red-500' : ''
                          } ${
                            itemClass?.includes('positive') ? 'bg-green-50 dark:bg-green-900/10 border-l-2 border-green-500' : ''
                          }`}
                        >
                          <div className="line-item-with-notes">
                            <div className="line-item text-black dark:text-white text-sm">
                              <span>{damageText}</span>
                            </div>
                          </div>
                          {damagePrice && (
                            <div className="appraisal-panel-adjustment-list-price">
                              <FormattedPrice price={damagePrice} priceClass={priceClass} className="text-sm" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
    <div className="appraisal-tires-panel">
      <div className="appraisal-panel bg-white dark:bg-[#1a1d29] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700/50 overflow-hidden">
        <PanelHeader
          title={section.title}
          headerPrice={section.headerPrice}
          icon={section.icon}
          panelClass={section.panelClass}
        />
        <div className="appraisal-panel-content py-3 px-5">
          {/* Tread Section */}
          <header className="mb-2 pb-1 border-b border-gray-200 dark:border-gray-700/50">
            <div className="title text-gray-900 dark:text-white font-medium text-sm">Tread</div>
            <div className="tire text-gray-600 dark:text-gray-400 text-xs text-center">FL</div>
            <div className="tire text-gray-600 dark:text-gray-400 text-xs text-center">FR</div>
            <div className="tire text-gray-600 dark:text-gray-400 text-xs text-center">RL</div>
            <div className="tire text-gray-600 dark:text-gray-400 text-xs text-center">RR</div>
            <div className="placeholder">&nbsp;</div>
          </header>

          {tread.map((row, index) => (
            <div key={index} className="row mb-1">
              <div className="title text-gray-900 dark:text-white text-sm">{row.title}</div>
              {row.tires.map((tire, tireIndex) => (
                <div key={tireIndex} className="circle-container">
                  <div className="circle w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                </div>
              ))}
              <div className="price">
                <FormattedPrice price={row.price} className="text-sm" />
              </div>
            </div>
          ))}

          {/* Wheel Issues Section */}
          <header className="wheels mt-2 mb-2 pb-1 border-b border-gray-200 dark:border-gray-700/50">
            <div className="title text-black dark:text-white font-medium text-sm">Wheel Issues</div>
          </header>

          {wheelIssues.map((row, index) => {
            const hasSelection = row.tires.some(t => t.selected);
            return (
              <div key={index} className={`row ${!hasSelection ? 'no-damage' : ''} mb-1`}>
                <div className="title text-black dark:text-white text-sm"> {row.title} </div>
                {row.tires.map((tire, tireIndex) => (
                  <div key={tireIndex} className="circle-container">
                    <div className="circle w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                  </div>
                ))}
                <div className="price">
                  <FormattedPrice price={row.price} className="text-sm" />
                </div>
              </div>
            );
          })}

          {/* No Damage section if no wheel issues are selected */}
          {wheelIssues.length > 0 && !wheelIssues.some(row => row.tires.some(t => t.selected)) && (
            <div className="appraisal-panel-damage-list">
              <div className="no-items text-center py-1 text-black dark:text-gray-400 text-sm">No Damage</div>
            </div>
          )}
        </div>
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
    <div className="appraisal-obd-panel">
      <div className={`appraisal-panel bg-white dark:bg-[#1a1d29] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700/50 overflow-hidden ${section.panelClass || ''}`}>
        <PanelHeader
          title={section.title}
          panelClass={section.panelClass}
        />
        <div className="appraisal-panel-content p-3">
          {!hasIssues ? (
            <section className="no-issues text-center py-4 text-green-600 dark:text-green-400 font-medium">
              {specialData.noIssuesText || 'No Issues Found'}
            </section>
          ) : (
            <div className="space-y-2">
              {specialData.issues?.map((issue, index) => (
                <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-700/30">
                  <div className="text-red-600 dark:text-red-400 text-sm">{issue}</div>
                </div>
              ))}
            </div>
          )}
        </div>
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
  vin,
}) => {
  const [reportData, setReportData] = useState<ConditionReportData | null>(data || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numColumns, setNumColumns] = useState(3);

  // Handle responsive columns based on window width
  useEffect(() => {
    if (!isOpen) return;
    
    const updateColumns = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        const newNumColumns = width >= 1920 ? 4 : 3;
        setNumColumns(newNumColumns);
      }
    };

    // Set initial value
    updateColumns();

    // Listen for window resize
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [isOpen]);

  useEffect(() => {
    // If data is provided, use it directly
    if (data) {
      setReportData(data);
      return;
    }

    // If no data but VIN is provided, fetch from API
    if (vin && isOpen) {
      setIsLoading(true);
      setError(null);
      ApiService.getConditionReport(vin)
        .then((response) => {
          // Transform API response to match ConditionReportData format
          const transformedData: ConditionReportData = {
            sections: response.sections || [],
            keyValuePairs: response.key_value_pairs || undefined,
          };
          setReportData(transformedData);
        })
        .catch((err) => {
          console.error('Error fetching condition report:', err);
          setError(err.message || 'Failed to load condition report');
          // Fall back to temp data if fetch fails
          setReportData(CONDITION_REPORT_TEMP_DATA);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!data && !vin) {
      // No VIN and no data provided, use temp data
      setReportData(CONDITION_REPORT_TEMP_DATA);
    }
  }, [vin, data, isOpen]);
  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="w-full h-full bg-white dark:bg-[#0f1117] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700/50 flex-shrink-0">
          <h2 className="text-xl font-semibold text-black dark:text-white">Condition Report</h2>
          <button
            onClick={onClose}
            className="text-black dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-[#0f1117]">
            <div className={`${numColumns === 4 ? 'max-w-[1920px]' : 'max-w-6xl'} mx-auto`}>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-black dark:text-gray-400 text-lg">Loading condition report...</p>
                </div>
              ) : error && !reportData ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 text-lg mb-2">Error loading condition report</p>
                    <p className="text-black dark:text-gray-400 text-sm">{error}</p>
                  </div>
                </div>
              ) : reportData && reportData.sections.length > 0 ? (
                <div className="appraisal-adjustments-panels flex flex-col gap-2">
                  <div className="flex flex-row gap-2">
                    {Array.from({ length: numColumns }, (_, colIndex) => (
                      <div key={colIndex} className="flex-1 flex flex-col gap-2">
                        {reportData.sections
                          .filter((_, index) => index % numColumns === colIndex)
                          .map((section) => (
                            <div key={section.dataQa}>
                              {renderPanel(section)}
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-black dark:text-gray-400 text-lg">No condition report data available</p>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};
