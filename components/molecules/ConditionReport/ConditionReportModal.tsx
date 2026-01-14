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

// Body Damage SVG Component
const BodyDamageGraphic: React.FC<{ noDamage: boolean }> = ({ noDamage }) => {
  return (
    <svg
      version="1.1"
      id="Ext_Vehicle"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      x="0px"
      y="0px"
      viewBox="0 0 240 240"
      xmlSpace="preserve"
      className="w-full h-auto max-w-md mx-auto"
      style={{ enableBackground: 'new 0 0 240 240' } as React.CSSProperties}
    >
      <polygon
        data-type="Front Glass"
        data-side="Left"
        points="75.3,81.7 75.3,120.3 92.5,120.3 92.5,95.9 92.5,95.9"
        className="ExtSVGElem"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1"
      />
      <polygon
        data-type="Back Glass"
        data-side="Left"
        points="75.3,161.3 75.3,122.7 92.5,122.7 92.5,147.1 92.5,147.1"
        className="ExtSVGElem"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        data-type="Windshield"
        d="M120.6,74.5c-0.5,0-1,0-1.5,0c-0.5,0-1,0-1.5,0c-18.1,0-31.8,1.7-42.1,4.4l19.3,15.8 c7-0.6,14.7-1,22.8-1c0.5,0,1,0,1.5,0c0.5,0,1,0,1.5,0c8.1,0,15.8,0.3,22.8,1l19.3-15.8C152.4,76.2,138.6,74.5,120.6,74.5z"
        className="ExtSVGElem"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        data-type="Rear Window"
        d="M120.6,167.7c-0.5,0-1,0-1.5,0c-0.5,0-1,0-1.5,0c-18.1,0-31.8-1.7-42.1-4.4l19.3-15.8 c7,0.6,14.7,1,22.8,1c0.5,0,1,0,1.5,0c0.5,0,1,0,1.5,0c8.1,0,15.8-0.3,22.8-1l19.3,15.8C152.4,166,138.6,167.7,120.6,167.7z"
        className="ExtSVGElem"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1"
      />
      <rect
        data-variable="roof"
        id="ext_roof"
        data-type="Roof"
        x="94.9"
        y="96.8"
        width="48.3"
        height="48.3"
        className="ExtSVGElem enabled"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1"
      />
      <g>
        <g>
          <g>
            <path
              data-variable="hood"
              id="ext_hood"
              data-type="Hood"
              d="M117.3,72.9c0.6,0,1.1,0,1.7,0c0.6,0,1.1,0,1.7,0c17.8,0,37.9,3.1,37.9,3.1 c2.7,0.4,4.6-1.5,4.2-4.2l-6.1-39.2c-0.4-2.7-3-4.9-5.8-4.9H86.1c-2.8,0-5.3,2.2-5.7,5l-5.3,39.1c-0.4,2.7,1.6,4.6,4.3,4.2 C79.4,76,99.5,72.9,117.3,72.9z"
              className="ExtSVGElem enabled"
              fill="currentColor"
              fillOpacity="0.3"
              stroke="currentColor"
              strokeWidth="1"
            />
          </g>
        </g>
      </g>
      <g>
        <g>
          <g>
            <path
              data-variable="trunk"
              id="ext_trunk"
              data-type="Trunk/Tailgate"
              d="M117.3,168.6c0.6,0,1.1,0,1.7,0c0.6,0,1.1,0,1.7,0c17.8,0,37.9-3.1,37.9-3.1 c2.7-0.4,4.6,1.5,4.1,4.2l-5.9,34.2c-0.5,2.7-3.1,4.9-5.9,4.9H86.1c-2.8,0-5.3-2.2-5.7-4.9l-5.1-34.2c-0.4-2.7,1.5-4.6,4.2-4.2 C79.4,165.5,99.5,168.6,117.3,168.6z"
              className="ExtSVGElem enabled"
              fill="currentColor"
              fillOpacity="0.3"
              stroke="currentColor"
              strokeWidth="1"
            />
          </g>
        </g>
      </g>
      <g>
        <g>
          <path
            data-variable="leftRocker"
            id="ext_left-rocker"
            data-side="Left"
            data-type="Rocker"
            d="M37.5,157.3c0,1.5-1.2,2.8-2.6,2.8c-1.4,0-2.6-1.2-2.6-2.8V81.2c0-1.5,1.2-2.8,2.6-2.8 c1.4,0,2.6,1.2,2.6,2.8V157.3z"
            className="ExtSVGElem enabled"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="currentColor"
            strokeWidth="1"
          />
        </g>
        <g>
          <path
            data-variable="leftRearDoor"
            id="ext_left-back-door"
            data-type="Back Door"
            data-side="Left"
            d="M72.4,156.5c0,2.8-2.2,5-5,5H45c-2.8,0-5-2.2-5-5v-29.7c0-2.8,2.2-5,5-5h22.4 c2.8,0,5,2.2,5,5L72.4,156.5L72.4,156.5z"
            className="ExtSVGElem enabled"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="currentColor"
            strokeWidth="1"
          />
        </g>
        <g>
          <g>
            <path
              data-variable="leftMirror"
              id="ext_left-mirror"
              data-type="Mirror"
              data-side="Left"
              d="M71.7,87c0,3.5-2.9,6.4-6.4,6.4s-6.4-2.9-6.4-6.4v-4.1c0-3.5,2.9-3.4,6.4-3.4 s6.4-0.1,6.4,3.4V87z"
              className="ExtSVGElem enabled"
              fill="currentColor"
              fillOpacity="0.3"
              stroke="currentColor"
              strokeWidth="1"
            />
          </g>
          <path
            data-variable="leftFrontDoor"
            data-type="Front Door"
            data-side="left"
            id="ext_left-front-door"
            d="M65.1,96.7c-4.9,0-8.9-4-8.9-8.9v-8h-11c-2.8,0-5,2.2-5,5v29.7c0,2.8,2.2,5,5,5h22.4c2.8,0,5-2.2,5-5h0v-22 C71.1,95,68.3,96.7,65.1,96.7z"
            className="ExtSVGElem enabled"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="currentColor"
            strokeWidth="1"
          />
        </g>
        <g>
          <path
            data-variable="leftFender"
            id="ext_left-front-fender"
            data-type="Front Fender"
            data-side="left"
            d="M67.7,32.5c-0.3-2.2-1.9-4-3.5-4s-4.8-0.2-7-0.4L45,26.9 c-2.2-0.2-4.7-0.4-5.5-0.4s-1.5,1.8-1.5,4V31c0,2.2,0.9,3.9,2,3.7c0,0,0,0,1,0c9,0,16.3,7.3,16.3,16.3c0,9-7.3,16.3-16.3,16.3 c-1,0-1,0-1,0c-1.1-0.2-2,1.5-2,3.7v0.3c0,2.2,0.7,4,1.5,4s3.3,0,5.5,0h21.2c2.2,0,4.7,0,5.5,0s1.3-1.8,1-4L67.7,32.5z"
            className="ExtSVGElem enabled"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="currentColor"
            strokeWidth="1"
          />
        </g>
        <circle
          id="ext_left-front-wheel"
          data-type="Front Wheel"
          data-side="left"
          cx="41"
          cy="50.9"
          r="14.6"
          className="ExtSVGElem"
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="1"
        />
        <g>
          <path
            data-variable="leftQuarterPanel"
            id="ext_left-rear-fender"
            data-type="Quarter Panel"
            data-side="left"
            d="M69.1,203.2c-0.2,2.2-2.1,4.2-4.3,4.4l-1,0.1c-2.2,0.2-5.8,0.5-8,0.7l-10.2,0.6 c-2.2,0.1-4.7,0.2-5.5,0.2s-1.5-1.2-1.5-2.8c0-1.5,0.9-2.6,2-2.5c0,0,0,0,1,0c9,0,16.3-7.3,16.3-16.3c0-9-7.3-16.3-16.3-16.3 c-1,0-1,0-1,0c-1.1,0.2-2-1.4-2-3.4c0-2,0.7-3.7,1.5-3.7s3.3,0,5.5,0h19.2c2.2,0,4.7,0,5.5,0s1.4,1.8,1.2,4L69.1,203.2z"
            className="ExtSVGElem enabled"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="currentColor"
            strokeWidth="1"
          />
        </g>
        <circle
          id="ext_left-rear-wheel"
          data-type="Rear Wheel"
          data-side="left"
          cx="41.7"
          cy="187.7"
          r="14.6"
          className="ExtSVGElem"
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="1"
        />
      </g>
      <g>
        <g>
          <path
            data-variable="rightRocker"
            id="ext_right-rocker"
            data-type="Rocker"
            data-side="right"
            d="M201.2,81.2c0-1.5,1.2-2.8,2.6-2.8c1.4,0,2.6,1.2,2.6,2.8v76.1 c0,1.5-1.2,2.8-2.6,2.8c-1.4,0-2.6-1.2-2.6-2.8V81.2z"
            className="ExtSVGElem enabled"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="currentColor"
            strokeWidth="1"
          />
        </g>
        <g>
          <path
            data-variable="rightRearDoor"
            id="ext_right-back-door"
            data-type="Back Door"
            data-side="right"
            d="M166.3,156.5v-29.7c0-2.8,2.2-5,5-5h22.4c2.8,0,5,2.2,5,5v29.7c0,2.8-2.2,5-5,5 h-22.4C168.5,161.5,166.3,159.3,166.3,156.5L166.3,156.5z"
            className="ExtSVGElem enabled"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="currentColor"
            strokeWidth="1"
          />
        </g>
        <g>
          <g>
            <path
              data-variable="rightMirror"
              id="ext_right-mirror"
              data-type="Mirror"
              data-side="right"
              d="M167,82.9c0-3.5,2.9-3.4,6.4-3.4c3.5,0,6.4-0.1,6.4,3.4V87c0,3.5-2.9,6.4-6.4,6.4 c-3.5,0-6.4-2.9-6.4-6.4V82.9z"
              className="ExtSVGElem enabled"
              fill="currentColor"
              fillOpacity="0.3"
              stroke="currentColor"
              strokeWidth="1"
            />
          </g>
          <path
            data-variable="rightFrontDoor"
            data-type="Front Door"
            data-side="right"
            id="ext_right-front-door"
            d="M173.5,96.7c4.9,0,8.9-4,8.9-8.9v-8h11c2.8,0,5,2.2,5,5v29.7c0,2.8-2.2,5-5,5H171c-2.8,0-5-2.2-5-5h0v-22 C167.6,95,170.4,96.7,173.5,96.7z"
            className="ExtSVGElem enabled"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="currentColor"
            strokeWidth="1"
          />
        </g>
        <g>
          <path
            data-variable="rightFender"
            id="ext_right-front-fender"
            data-type="Front Fender"
            data-side="right"
            d="M166,71.4c-0.3,2.2,0.2,4,1,4s3.3,0,5.5,0h21.2c2.2,0,4.7,0,5.5,0 c0.8,0,1.5-1.8,1.5-4V71c0-2.2-0.9-3.9-2-3.7c0,0,0,0-1,0c-9,0-16.3-7.3-16.3-16.3c0-9,7.3-16.3,16.3-16.3c1,0,1,0,1,0 c1.1,0.2,2-1.5,2-3.7v-0.5c0-2.2-0.7-4-1.5-4s-3.3,0.2-5.5,0.4l-12.2,1.2c-2.2,0.2-5.3,0.4-7,0.4c-1.6,0-3.2,1.8-3.5,4L166,71.4z"
            className="ExtSVGElem enabled"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="currentColor"
            strokeWidth="1"
          />
        </g>
        <circle
          id="ext_right-front-wheel"
          data-type="Front Wheel"
          data-side="right"
          cx="197.7"
          cy="50.9"
          r="14.6"
          className="ExtSVGElem"
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="1"
        />
        <g>
          <path
            data-variable="rightQuarterPanel"
            id="ext_right-rear-fender"
            data-type="Quarter Panel"
            data-side="right"
            d="M167.1,168.3c-0.2-2.2,0.4-4,1.2-4s3.3,0,5.5,0H193c2.2,0,4.7,0,5.5,0 s1.5,1.6,1.5,3.7c0,2-0.9,3.5-2,3.4c0,0,0,0-1,0c-9,0-16.3,7.3-16.3,16.3c0,9,7.3,16.3,16.3,16.3c1,0,1,0,1,0c1.1-0.2,2,1,2,2.5 c0,1.5-0.7,2.8-1.5,2.8s-3.3-0.1-5.5-0.2l-10.2-0.6c-2.2-0.1-5.8-0.4-8-0.7l-1-0.1c-2.2-0.2-4.1-2.2-4.3-4.4L167.1,168.3z"
            className="ExtSVGElem enabled"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="currentColor"
            strokeWidth="1"
          />
        </g>
        <circle
          id="ext_right-rear-wheel"
          data-type="Rear Wheel"
          data-side="right"
          cx="197"
          cy="187.7"
          r="14.6"
          className="ExtSVGElem"
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="1"
        />
      </g>
      <polygon
        data-type="Front Glass"
        data-side="right"
        points="162.6,81.7 162.6,120.3 145.4,120.3 145.4,95.9 145.4,95.9"
        className="ExtSVGElem"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1"
      />
      <polygon
        data-type="Back Glass"
        data-side="right"
        points="162.6,161.3 162.6,122.7 145.4,122.7 145.4,147.1 145.4,147.1"
        className="ExtSVGElem"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1"
      />
      <g>
        <path
          data-variable="rearBumper"
          id="ext_rear-bumper"
          data-type="Rear Bumper"
          d="M80.1,210.2c-0.6,0-1,0.4-1,1v6.3c0,0.6,0.4,0,1,0H82c0.6,0,1,0.6,1,0v-0.6 c0-0.6,0.4-1,1-1h14.5c0.6,0,1,0.4,1,1v0.6c0,0.6,0.4,0,1,0h34.8c0.6,0,1,0.6,1,0v-0.6c0-0.6,0.4-1,1-1h14.5c0.6,0,1,0.4,1,1v0.6 c0,0.6,0.4,0,1,0h1.9c0.6,0,1,0.6,1,0v-6.3c0-0.6-0.4-1-1-1H80.1z"
          className="ExtSVGElem enabled"
          fill="currentColor"
          fillOpacity="0.3"
          stroke="currentColor"
          strokeWidth="1"
        />
      </g>
      <g>
        <path
          data-variable="rearLeftLight"
          id="ext_rear-left-light"
          data-type="Rear Light"
          data-side="left"
          d="M99,223c0,2.1-0.9,3.8-2,3.8H85.3c-1.1,0-2-1.7-2-3.8v-1.9c0-2.1,0.9-3.8,2-3.8H97 c1.1,0,2,1.7,2,3.8L99,223L99,223z"
          className="ExtSVGElem enabled"
          fill="currentColor"
          fillOpacity="0.3"
          stroke="currentColor"
          strokeWidth="1"
        />
      </g>
      <g>
        <path
          data-variable="rearRightLight"
          id="ext_rear-right-light"
          data-type="Rear Light"
          data-side="right"
          d="M152.4,223c0,2.1-0.9,3.8-2,3.8h-11.7c-1.1,0-2-1.7-2-3.8v-1.9c0-2.1,0.9-3.8,2-3.8 h11.7c1.1,0,2,1.7,2,3.8L152.4,223L152.4,223z"
          className="ExtSVGElem enabled"
          fill="currentColor"
          fillOpacity="0.3"
          stroke="currentColor"
          strokeWidth="1"
        />
      </g>
      <path
        data-variable="frontBumper"
        data-type="Front Bumper"
        id="ext_front-bumper"
        d="M156.9,17.2h-2.3c-1.9,2.3-4.7,3.7-7.9,3.7s-6-1.5-7.9-3.7H99c-1.9,2.3-4.7,3.7-7.9,3.7c-3.2,0-6-1.5-7.9-3.7 h-2c-0.5,0-1,0.4-1,1v2.3c0,0.6,0.5,5,1,5h75.7c0.6,0,1-4.4,1-5v-2.3C157.9,17.6,157.4,17.2,156.9,17.2z"
        className="ExtSVGElem enabled"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1"
      />
      <g>
        <path
          data-variable="leftFrontLight"
          id="ext_front-left-light"
          data-type="Front Light"
          data-side="Left"
          d="M91.3,6.4c-5.7,0-11.4,4-10.2,4.9c4.4,3.2,4.6,7.3,10.2,7.3c5.7,0,5.7-4.1,10.2-7.3 C102.2,10.7,96.9,6.4,91.3,6.4z"
          className="ExtSVGElem enabled"
          fill="currentColor"
          fillOpacity="0.3"
          stroke="currentColor"
          strokeWidth="1"
        />
      </g>
      <g>
        <path
          data-variable="rightFrontLight"
          id="ext_front-right-light"
          data-type="Front Light"
          data-side="Right"
          d="M146.7,6.4c-5.7,0-11.4,4-10.2,4.9c4.4,3.2,4.6,7.3,10.2,7.3c5.7,0,5.7-4.1,10.2-7.3 C157.7,10.7,152.3,6.4,146.7,6.4z"
          className="ExtSVGElem enabled"
          fill="currentColor"
          fillOpacity="0.3"
          stroke="currentColor"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
};

// Interior Damage SVG Component
const InteriorDamageGraphic: React.FC<{ noDamage: boolean }> = ({ noDamage }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      version="1.1"
      id="int_Layer_1"
      x="0px"
      y="0px"
      viewBox="0 0 240 240"
      enableBackground="new 0 0 240 240"
      xmlSpace="preserve"
      className="w-full h-auto max-w-md mx-auto"
    >
      <path
        data-variable="rearLeftDoorPanel"
        data-type="Rear Door Panel"
        data-side="Left"
        data-svg-clicked-val="door panel"
        id="int_left-rear-door-panel"
        d="M45.996 143.586C45.996 146.336 43.746 148.586 40.996 148.586H18.614C15.864 148.586 13.614 146.336 13.614 143.586V113.84C13.614 111.09 15.864 108.84 18.614 108.84H40.997C43.747 108.84 45.997 111.09 45.997 113.84L45.996 143.586Z"
        className="IntSVGElem enabled"
      />
      <path
        data-variable="frontLeftDoorPanel"
        data-type="Front Door Panel"
        data-side="Left"
        data-svg-clicked-val="door panel"
        id="int_left-front-door-panel"
        d="M40.534 80.516C37.784 80.516 35.534 78.266 35.534 75.516V69.5C35.534 66.75 33.284 64.5 30.534 64.5H18.614C15.864 64.5 13.614 66.75 13.614 69.5V101.815C13.614 104.565 15.864 106.815 18.614 106.815H40.997C43.747 106.815 45.997 104.565 45.997 101.815V85.516C45.997 82.766 43.747 80.516 40.997 80.516H40.534Z"
        className="IntSVGElem enabled"
      />
      <path
        data-variable="rearRightDoorPanel"
        data-type="Rear Door Panel"
        data-side="Right"
        data-svg-clicked-val="door panel"
        id="int_right-rear-door-panel"
        d="M142.793 143.586C142.793 146.336 145.043 148.586 147.793 148.586H170.176C172.926 148.586 175.176 146.336 175.176 143.586V113.84C175.176 111.09 172.926 108.84 170.176 108.84H147.793C145.043 108.84 142.793 111.09 142.793 113.84V143.586Z"
        className="IntSVGElem enabled"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.079 144.373C11.079 145.894 9.89901 147.135 8.45801 147.135C7.01901 147.135 5.83701 145.895 5.83701 144.373V68.291C5.83701 66.771 7.01901 65.529 8.45801 65.529C9.89901 65.529 11.079 66.771 11.079 68.291V144.373Z"
        fill="#F5F9FA"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M50.868 67.529V106.136H68.115V81.699H68.117L50.868 67.529Z"
        fill="#F5F9FA"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M50.868 147.134V108.527H68.115V132.964H68.117L50.868 147.134Z"
        fill="#F5F9FA"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M96.155 60.316C95.636 60.316 95.138 60.322 94.63 60.324C94.12 60.322 93.622 60.316 93.103 60.316C75.044 60.316 61.279 62.019 50.99 64.668L70.277 80.516C77.261 79.897 84.98 79.551 93.103 79.551C93.617 79.551 94.121 79.559 94.63 79.561C95.14 79.559 95.644 79.551 96.155 79.551C104.278 79.551 111.999 79.897 118.979 80.516L138.268 64.668C127.979 62.02 114.213 60.316 96.155 60.316Z"
        fill="#F5F9FA"
      />
      <rect x="70.459" y="82.648" width="48.334" height="48.334" fill="#F5F9FA" />
      <circle cx="64.37" cy="4.405" r="3.746" fill="#F5F9FA" />
      <circle cx="124.369" cy="4.40503" r="3.745" fill="#F5F9FA" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M45.996 74C45.996 76.75 43.928 79 41.4 79C38.872 79 36.804 76.75 36.804 74V70.833C36.804 68.083 38.872 65.833 41.4 65.833C43.928 65.833 45.996 68.083 45.996 70.833V74Z"
        fill="#F5F9FA"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M92.916 58.773C93.496 58.773 94.055 58.781 94.627 58.785C95.197 58.781 95.756 58.773 96.336 58.773C114.125 58.773 134.225 61.864 134.225 61.864C136.944 62.282 138.821 60.401 138.395 57.684L132.284 18.526C131.858 15.809 129.263 13.586 126.513 13.586H61.709C58.959 13.586 56.408 15.816 56.04 18.541L50.757 57.667C50.389 60.392 52.312 62.28 55.03 61.862C55.032 61.863 75.127 58.773 92.916 58.773Z"
        fill="#F5F9FA"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M69.5 134C70.08 134 93.428 134.005 94 134C94.57 134.005 118.92 134 119.5 134C121 135.5 138.311 150 138.311 150C138.311 151.5 138.311 153 138.311 155.513L132.368 189.699C131.897 192.408 129.264 194.625 126.514 194.625H61.709C58.959 194.625 56.374 192.4 55.966 189.683L50.831 155.533C50.831 153 50.831 151 50.831 149.5C52.831 148 67.5 135.5 69.5 134Z"
        fill="#F5F9FA"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M128.754 6.98401C128.203 6.98401 127.459 7.32401 127.098 7.73901C127.098 7.73901 125.871 9.15101 124.369 9.15101C122.867 9.15101 121.64 7.73901 121.64 7.73901C121.28 7.32401 120.534 6.98401 119.985 6.98401H68.755C68.205 6.98401 67.46 7.32401 67.099 7.73901C67.099 7.73901 65.872 9.15101 64.37 9.15101C62.868 9.15101 61.641 7.73901 61.641 7.73901C61.28 7.32401 60.535 6.98401 59.985 6.98401H56.794C56.244 6.98401 55.794 7.43401 55.794 7.98401V10.317C55.794 10.867 56.244 11.317 56.794 11.317H132.461C133.012 11.317 133.461 10.867 133.461 10.317V7.98401C133.461 7.43401 133.012 6.98401 132.461 6.98401H128.754V6.98401Z"
        fill="#F5F9FA"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M41.301 19.555C41.021 17.372 39.443 15.587 37.792 15.587C36.141 15.587 33.001 15.409 30.812 15.192L18.595 13.981C16.406 13.764 13.94 13.586 13.115 13.586C12.29 13.586 11.615 15.386 11.615 17.586V18.111C11.615 20.311 12.503 21.982 13.588 21.823C13.588 21.823 13.588 21.823 14.615 21.823C23.607 21.823 30.896 29.111 30.896 38.105C30.896 47.096 23.607 54.385 14.615 54.385C13.588 54.385 13.588 54.385 13.588 54.385C12.503 54.227 11.615 55.898 11.615 58.098V58.414C11.615 60.614 12.29 62.414 13.115 62.414C13.94 62.414 16.415 62.414 18.615 62.414H39.793C41.993 62.414 44.468 62.414 45.293 62.414C46.118 62.414 46.564 60.629 46.284 58.446L41.301 19.555Z"
        fill="#F5F9FA"
      />
      <circle cx="14.615" cy="38.002" r="14.615" fill="#F5F9FA" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M42.738 190.257C42.585 192.451 40.67 194.445 38.483 194.69L37.434 194.806C35.247 195.048 31.662 195.347 29.464 195.468L19.275 196.029C17.078 196.15 14.606 196.25 13.781 196.25C12.956 196.25 12.281 195.006 12.281 193.486C12.281 191.966 13.17 190.853 14.256 191.009C14.256 191.009 14.256 191.009 15.281 191.009C24.273 191.009 31.562 183.723 31.562 174.729C31.562 165.737 24.273 158.446 15.281 158.446C14.256 158.446 14.256 158.446 14.256 158.446C13.17 158.604 12.281 157.088 12.281 155.076C12.281 153.063 12.956 151.418 13.781 151.418C14.606 151.418 17.081 151.418 19.281 151.418H38.459C40.659 151.418 43.134 151.418 43.959 151.418C44.784 151.418 45.333 153.213 45.18 155.408L42.738 190.257Z"
        fill="#F5F9FA"
      />
      <circle cx="15.281" cy="174.832" r="14.615" fill="#F5F9FA" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M138.244 67.529V106.136H120.998V81.699L138.244 67.529Z"
        fill="#F5F9FA"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M138.244 147.134V108.527H120.998V132.964L138.244 147.134Z"
        fill="#F5F9FA"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M55.713 195.992C55.163 195.992 54.713 196.442 54.713 196.992V199.326C54.713 199.877 55.163 200.326 55.713 200.326H57.592C58.142 200.326 58.592 199.877 58.592 199.326V198.703C58.592 198.152 59.042 197.703 59.592 197.703H74.135C74.685 197.703 75.135 198.152 75.135 198.703V199.326C75.135 199.877 75.585 200.326 76.135 200.326H110.957C111.508 200.326 111.957 199.877 111.957 199.326V198.703C111.957 198.152 112.406 197.703 112.957 197.703H127.5C128.051 197.703 128.5 198.152 128.5 198.703V199.326C128.5 199.877 128.949 200.326 129.5 200.326H131.379C131.93 200.326 132.379 199.877 132.379 199.326V196.992C132.379 196.442 131.93 195.992 131.379 195.992H55.713Z"
        fill="#F5F9FA"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M74.618 201.141C74.618 202.242 73.718 203.141 72.618 203.141H60.918C59.818 203.141 58.918 202.242 58.918 201.141V200.16C58.918 199.059 59.818 198.16 60.918 198.16H72.617C73.717 198.16 74.617 199.059 74.617 200.16L74.618 201.141Z"
        fill="#F5F9FA"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M127.992 201.141C127.992 202.242 127.094 203.141 125.992 203.141H114.293C113.193 203.141 112.293 202.242 112.293 201.141V200.16C112.293 199.059 113.193 198.16 114.293 198.16H125.992C127.092 198.16 127.992 199.059 127.992 200.16V201.141Z"
        fill="#F5F9FA"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M177.711 68.291C177.711 66.771 178.891 65.529 180.332 65.529C181.77 65.529 182.953 66.771 182.953 68.291V144.373C182.953 145.894 181.77 147.135 180.332 147.135C178.891 147.135 177.711 145.895 177.711 144.373V68.291Z"
        fill="#F5F9FA"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M142.793 74C142.793 76.75 144.861 79 147.389 79C149.917 79 151.987 76.75 151.987 74V70.833C151.987 68.083 149.919 65.833 147.389 65.833C144.862 65.833 142.793 68.083 142.793 70.833V74Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M147.491 19.555C147.77 17.372 149.348 15.587 151.001 15.587C152.654 15.587 155.792 15.409 157.98 15.192L170.197 13.981C172.386 13.764 174.853 13.586 175.677 13.586C176.501 13.586 177.177 15.386 177.177 17.586V18.111C177.177 20.311 176.288 21.982 175.202 21.823C175.202 21.823 175.202 21.823 174.177 21.823C165.185 21.823 157.896 29.111 157.896 38.105C157.896 47.096 165.185 54.385 174.177 54.385C175.202 54.385 175.202 54.385 175.202 54.385C176.288 54.227 177.177 55.898 177.177 58.098V58.414C177.177 60.614 176.501 62.414 175.677 62.414C174.853 62.414 172.376 62.414 170.177 62.414H148.999C146.8 62.414 144.323 62.414 143.499 62.414C142.675 62.414 142.228 60.629 142.509 58.446L147.491 19.555Z"
        fill="#F5F9FA"
      />
      <circle cx="174.176" cy="38.002" r="14.615" fill="#F5F9FA" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M146.053 190.257C146.205 192.451 148.121 194.445 150.309 194.69L151.358 194.806C153.546 195.048 157.129 195.347 159.327 195.468L169.516 196.029C171.712 196.15 174.186 196.25 175.01 196.25C175.834 196.25 176.51 195.006 176.51 193.486C176.51 191.966 175.619 190.853 174.533 191.009C174.533 191.009 174.533 191.009 173.51 191.009C164.518 191.009 157.229 183.723 157.229 174.729C157.229 165.737 164.518 158.446 173.51 158.446C174.533 158.446 174.533 158.446 174.533 158.446C175.619 158.604 176.51 157.088 176.51 155.076C176.51 153.063 175.834 151.418 175.01 151.418C174.186 151.418 171.709 151.418 169.51 151.418H150.332C148.133 151.418 145.656 151.418 144.832 151.418C144.008 151.418 143.457 153.213 143.611 155.408L146.053 190.257Z"
        fill="#F5F9FA"
      />
      <circle cx="173.51" cy="174.832" r="14.615" fill="#F5F9FA" />
      <path
        data-variable="frontRightDoorPanel"
        data-type="Front Door Panel"
        data-side="Right"
        data-svg-clicked-val="door panel"
        id="int_right-front-door-panel"
        d="M148.256 80.516C151.006 80.516 153.256 78.266 153.256 75.516V69.5C153.256 66.75 155.506 64.5 158.256 64.5H170.176C172.926 64.5 175.176 66.75 175.176 69.5V101.815C175.176 104.565 172.926 106.815 170.176 106.815H147.793C145.043 106.815 142.793 104.565 142.793 101.815V85.516C142.793 82.766 145.043 80.516 147.793 80.516H148.256Z"
        className="IntSVGElem enabled"
      />
      <path
        data-variable="centerConsole"
        data-type="Center Console"
        data-side=""
        data-svg-clicked-val="center console"
        id="int_center-console"
        d="M99.201 74.867C99.201 76.309 97.85 77.489 96.201 77.489H92.889C91.239 77.489 89.889 76.309 89.889 74.867V66.545C89.889 65.103 91.239 63.923 92.889 63.923H96.201C97.85 63.923 99.201 65.103 99.201 66.545V74.867Z"
        className="IntSVGElem enabled"
      />
      <path
        data-variable="gloveBox"
        data-type="Glove Box"
        data-side=""
        data-svg-clicked-val="glove box"
        id="int_glove-box"
        d="M121.844 75.348V70.784C121.844 70.373 121.49 70.042 121.053 70.042H109.104C108.666 70.042 108.315 70.374 108.315 70.784V75.348H121.844Z"
        className="IntSVGElem enabled"
      />
      <path
        data-variable="frontLeftSeat"
        data-type="Front Seat"
        data-side="Left"
        data-svg-clicked-val="seats"
        id="int_left-front-seat"
        d="M84.033 81.612C85.683 81.612 87.033 82.962 87.033 84.612V99.112C87.033 99.2335 87.0257 99.3533 87.0115 99.4712C88.3125 99.7992 89.283 100.984 89.283 102.381V104.862C89.283 106.511 87.933 107.862 86.283 107.862H68.283C66.633 107.862 65.283 106.511 65.283 104.862V102.381C65.283 101.07 66.1357 99.9478 67.314 99.5425C67.2936 99.4019 67.283 99.2581 67.283 99.112V84.612C67.283 82.962 68.633 81.612 70.283 81.612H84.033Z"
        className="IntSVGElem enabled"
      />
      <path
        data-variable="rearLeftSeat"
        data-type="Rear Seat"
        data-side="Left"
        data-svg-clicked-val="seats"
        id="int_left-rear-seat"
        d="M84.033 117.612C85.683 117.612 87.033 118.963 87.033 120.612V135.112C87.033 135.234 87.0256 135.354 87.0113 135.472C88.3124 135.8 89.283 136.983 89.283 138.382V140.861C89.283 142.511 87.933 143.861 86.283 143.861H68.283C66.633 143.861 65.283 142.511 65.283 140.861V138.382C65.283 137.071 66.1358 135.949 67.3142 135.543C67.2936 135.402 67.283 135.258 67.283 135.112V120.612C67.283 118.963 68.633 117.612 70.283 117.612H84.033Z"
        className="IntSVGElem enabled"
      />
      <path
        data-variable="thirdRowSeat"
        data-type="Third Row Seat"
        data-side=""
        data-svg-clicked-val="3rd seat std"
        id="int_third-row-seat"
        d="M116.75 153C118.4 153 119.75 154.351 119.75 156V170.5C119.75 170.622 119.743 170.742 119.728 170.86C121.029 171.188 122 172.371 122 173.77V176.249C122 177.899 120.65 179.249 119 179.249H71C69.35 179.249 68 177.899 68 176.249V173.77C68 172.459 68.8528 171.337 70.0312 170.931C70.0106 170.79 70 170.646 70 170.5V156C70 154.351 71.35 153 73 153H116.75Z"
        fill="#008064"
        className="IntSVGElem enabled"
      />
      <path
        data-variable="frontRightSeat"
        data-type="Front Seat"
        data-side="Right"
        data-svg-clicked-val="seats"
        id="int_right-front-seat"
        d="M117.033 81.612C118.681 81.612 120.033 82.962 120.033 84.612V99.112C120.033 99.2335 120.026 99.3534 120.011 99.4713C121.311 99.7996 122.283 100.984 122.283 102.381V104.862C122.283 106.511 120.931 107.862 119.283 107.862H101.283C99.634 107.862 98.283 106.511 98.283 104.862V102.381C98.283 101.07 99.1362 99.948 100.314 99.5427C100.294 99.4019 100.283 99.2582 100.283 99.112V84.612C100.283 82.962 101.634 81.612 103.283 81.612H117.033Z"
        fill="#008064"
        className="IntSVGElem enabled"
      />
      <path
        data-variable="rearRightSeat"
        data-type="Rear Seat"
        data-side="Right"
        data-svg-clicked-val="seats"
        id="int_right-rear-seat"
        d="M117.033 117.612C118.681 117.612 120.033 118.963 120.033 120.612V135.112C120.033 135.234 120.026 135.354 120.011 135.472C121.311 135.8 122.283 136.983 122.283 138.382V140.861C122.283 142.511 120.931 143.861 119.283 143.861H101.283C99.634 143.861 98.283 142.511 98.283 140.861V138.382C98.283 137.071 99.1362 135.949 100.314 135.544C100.294 135.403 100.283 135.258 100.283 135.112V120.612C100.283 118.963 101.634 117.612 103.283 117.612H117.033Z"
        fill="#008064"
        className="IntSVGElem enabled"
      />
      <path
        clipRule="evenodd"
        fillRule="evenodd"
        data-variable="headliner"
        data-type="Headliner/Carpet"
        data-svg-clicked-val="headliner carpet"
        id="int_headliner"
        data-side=""
        d="M55.1536 62.5624C52.7539 62.9746 51 65.0554 51 67.4903V153.5C51 153.5 51 155 51 159.5C51 164 56 189 56 189C56 191.761 58.2386 194 61 194H128C130.761 194 133 191.761 133 189C133 189 138 164 138 159.5C138 155 138 153.5 138 153.5V67.5225C138 65.0734 136.226 62.9849 133.809 62.5884L99.2988 56.9274C95.4598 56.2977 91.5427 56.3124 87.7085 56.9709L55.1536 62.5624ZM59.4871 68.2265C58.0496 68.4759 57 69.7233 57 71.1823V152C57 152 57 154 57 158.5C57 163 62 184.676 62 184.676C62 186.333 63.3431 187.676 65 187.676H124C125.657 187.676 127 186.333 127 184.676C127 184.676 132 163.5 132 158.5C132 153.5 132 152 132 152V71.2018C132 69.7342 130.938 68.4821 129.491 68.2421L99.495 63.271C95.618 62.6284 91.6604 62.6434 87.7884 63.3154L59.4871 68.2265Z"
        className="IntSVGElem enabled"
      />
    </svg>
  );
};

// Glass Damage SVG Component (simplified)
const GlassDamageGraphic: React.FC<{ noDamage: boolean }> = ({ noDamage }) => {
  return (
    <svg
      version="1.1"
      id="Ext_Vehicle"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      x="0px"
      y="0px"
      viewBox="0 0 240 240"
      xmlSpace="preserve"
      className="w-full h-auto max-w-md mx-auto"
      style={{ enableBackground: 'new 0 0 240 240' } as React.CSSProperties}
    >
      <polygon
        data-variable="leftFrontGlass"
        id="ext_left-front-glass"
        data-type="Front Glass"
        data-side="Left"
        points="75.3,81.7 75.3,120.3 92.5,120.3 92.5,95.9 92.5,95.9"
        className="enabled ExtSVGElem"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1"
      />
      <polygon
        data-variable="leftRearGlass"
        id="ext_left-back-glass"
        data-type="Back Glass"
        data-side="Left"
        points="75.3,161.3 75.3,122.7 92.5,122.7 92.5,147.1 92.5,147.1"
        className="enabled ExtSVGElem"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        data-variable="windshield"
        id="ext_windshield"
        data-type="Windshield"
        d="M120.6,74.5c-0.5,0-1,0-1.5,0c-0.5,0-1,0-1.5,0c-18.1,0-31.8,1.7-42.1,4.4l19.3,15.8 c7-0.6,14.7-1,22.8-1c0.5,0,1,0,1.5,0c0.5,0,1,0,1.5,0c8.1,0,15.8,0.3,22.8,1l19.3-15.8C152.4,76.2,138.6,74.5,120.6,74.5z"
        className="enabled ExtSVGElem"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        data-variable="rearWindow"
        id="ext_rear-window"
        data-type="Rear Window"
        d="M120.6,167.7c-0.5,0-1,0-1.5,0c-0.5,0-1,0-1.5,0c-18.1,0-31.8-1.7-42.1-4.4l19.3-15.8 c7,0.6,14.7,1,22.8,1c0.5,0,1,0,1.5,0c0.5,0,1,0,1.5,0c8.1,0,15.8-0.3,22.8-1l19.3,15.8C152.4,166,138.6,167.7,120.6,167.7z"
        className="enabled ExtSVGElem"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1"
      />
      <rect
        id="ext_roof"
        data-type="Roof"
        data-variable="roofGlass"
        x="94.9"
        y="96.8"
        width="48.3"
        height="48.3"
        className="enabled ExtSVGElem"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1"
      />
      <polygon
        data-variable="rightFrontGlass"
        id="ext_right-front-glass"
        data-type="Front Glass"
        data-side="right"
        points="162.6,81.7 162.6,120.3 145.4,120.3 145.4,95.9 145.4,95.9"
        className="ExtSVGElem enabled"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1"
      />
      <polygon
        data-variable="rightRearGlass"
        id="ext_right-back-glass"
        data-type="Back Glass"
        data-side="right"
        points="162.6,161.3 162.6,122.7 145.4,122.7 145.4,147.1 145.4,147.1"
        className="ExtSVGElem enabled"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
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
    if (graphicType === 'body') {
      return <BodyDamageGraphic noDamage={noDamage} />;
    } else if (graphicType === 'interior') {
      return <InteriorDamageGraphic noDamage={noDamage} />;
    } else if (graphicType === 'glass') {
      return <GlassDamageGraphic noDamage={noDamage} />;
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
                <div className="space-y-2">
                  {specialData.damageItems?.map((damage, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700/30"
                    >
                      <div className="text-black dark:text-white text-sm">{damage.name || damage}</div>
                      {damage.cost !== undefined && (
                        <span className="text-red-500 dark:text-red-400 font-semibold text-sm">
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
