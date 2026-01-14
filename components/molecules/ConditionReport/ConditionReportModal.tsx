'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ApiService } from '../../../lib/services/api';
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
  vin?: string;
}

// Helper function to get price color class
const getPriceClass = (priceClass: string): string => {
  if (priceClass.includes('positive')) return 'text-green-400';
  if (priceClass.includes('negative')) return 'text-red-400';
  return 'text-gray-400';
};

// Formatted Price Component
const FormattedPrice: React.FC<{ price: string; className?: string; priceClass?: string }> = ({ price, className = '', priceClass = '' }) => {
  let finalPriceClass = priceClass;
  if (!finalPriceClass) {
    finalPriceClass = price.includes('+') ? 'text-green-400' : 
                     price.includes('-') ? 'text-red-400' : 
                     'text-gray-400';
  } else {
    // Map priceClass string to Tailwind classes
    if (finalPriceClass.includes('positive')) finalPriceClass = 'text-green-400';
    else if (finalPriceClass.includes('negative')) finalPriceClass = 'text-red-400';
    else finalPriceClass = 'text-gray-400';
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
  const priceClass = panelClass === 'positive' ? 'text-green-400' : 
                     panelClass === 'negative' ? 'text-red-400' : 
                     'text-gray-400';

  return (
    <header className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50">
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
    <div className={`appraisal-panel bg-[#1a1d29] rounded-lg shadow-sm border border-gray-700/50 overflow-hidden ${section.panelClass || ''}`}>
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
                    item.itemClass?.includes('negative') ? 'bg-red-900/10 border-l-2 border-red-500' : ''
                  } ${
                    item.itemClass?.includes('positive') ? 'bg-green-900/10 border-l-2 border-green-500' : ''
                  } ${
                    item.itemClass?.includes('not-selected') ? 'opacity-60' : ''
                  }`}
                >
                  <div className="line-item-with-notes">
                    <div className="line-item text-white text-sm">
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
        {section.unselectedItems.length > 0 && (
          <div className="appraisal-panel-unselected-items mt-2 pt-2 border-t border-gray-700/50">
            <div className="text-gray-400 text-xs">
              Not Selected: {section.unselectedItems.join(', ')}
            </div>
          </div>
        )}
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

// Interior Damage SVG Component (simplified - full version would be very long)
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
      {/* Full interior SVG paths would go here - using simplified version for now */}
      <g>
        <path
          d="M37.858,162.473c0,1.521-1.18,2.762-2.621,2.762c-1.439,0-2.621-1.24-2.621-2.762V86.391   c0-1.52,1.182-2.762,2.621-2.762c1.441,0,2.621,1.242,2.621,2.762V162.473z"
          fill="currentColor"
          className="text-gray-600"
        />
      </g>
      {/* Add more interior SVG paths as needed */}
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
      <div className={`appraisal-panel bg-[#1a1d29] rounded-lg shadow-sm border border-gray-700/50 overflow-hidden`}>
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
                <div className="no-items text-center py-1 text-gray-400 text-sm">
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
      <div className="appraisal-panel bg-[#1a1d29] rounded-lg shadow-sm border border-gray-700/50 overflow-hidden">
        <PanelHeader
          title={section.title}
          headerPrice={section.headerPrice}
          icon={section.icon}
          panelClass={section.panelClass}
        />
        <div className="appraisal-panel-content p-3">
          {/* Tread Section */}
          <header className="grid grid-cols-6 gap-2 mb-2 pb-1 border-b border-gray-700/50">
            <div className="title text-white font-medium text-sm">Tread</div>
            <div className="tire text-gray-400 text-xs text-center">FL</div>
            <div className="tire text-gray-400 text-xs text-center">FR</div>
            <div className="tire text-gray-400 text-xs text-center">RL</div>
            <div className="tire text-gray-400 text-xs text-center">RR</div>
            <div className="placeholder">&nbsp;</div>
          </header>

          {tread.map((row, index) => (
            <div key={index} className="row grid grid-cols-6 gap-2 items-center mb-1">
              <div className="title text-white text-sm">{row.title}</div>
              {row.tires.map((tire, tireIndex) => (
                <div key={tireIndex} className="circle-container flex justify-center">
                  <div className={`circle w-4 h-4 rounded-full border-2 ${
                    tire.selected ? 'border-green-400 bg-green-400/20' : 'border-gray-600'
                  }`} />
                </div>
              ))}
              <div className="price text-right">
                <FormattedPrice price={row.price} className="text-sm" />
              </div>
            </div>
          ))}

          {/* Wheel Issues Section */}
          <header className="wheels grid grid-cols-6 gap-2 mt-2 mb-2 pb-1 border-b border-gray-700/50">
            <div className="title text-white font-medium text-sm">Wheel Issues</div>
          </header>

          {wheelIssues.map((row, index) => {
            const hasSelection = row.tires.some(t => t.selected);
            return (
              <div key={index} className={`row ${!hasSelection ? 'no-damage' : ''} grid grid-cols-6 gap-2 items-center mb-1 ${!hasSelection ? 'opacity-60' : ''}`}>
                <div className="title text-white text-sm">{row.title}</div>
                {row.tires.map((tire, tireIndex) => (
                  <div key={tireIndex} className="circle-container flex justify-center">
                    <div className={`circle w-4 h-4 rounded-full border-2 ${
                      tire.selected ? 'border-red-400 bg-red-400/20' : 'border-gray-600'
                    }`} />
                  </div>
                ))}
                <div className="price text-right">
                  <FormattedPrice price={row.price} className="text-sm" />
                </div>
              </div>
            );
          })}

          {section.unselectedItems.length > 0 && (
            <div className="appraisal-panel-unselected-items mt-2 pt-2 border-t border-gray-700/50">
              <div className="text-gray-400 text-xs">
                Not Selected: {section.unselectedItems.join(', ')}
              </div>
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
      <div className={`appraisal-panel bg-[#1a1d29] rounded-lg shadow-sm border border-gray-700/50 overflow-hidden ${section.panelClass || ''}`}>
        <PanelHeader
          title={section.title}
          panelClass={section.panelClass}
        />
        <div className="appraisal-panel-content p-3">
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
            <div className="max-w-6xl mx-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-400 text-lg">Loading condition report...</p>
                </div>
              ) : error && !reportData ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <p className="text-red-400 text-lg mb-2">Error loading condition report</p>
                    <p className="text-gray-400 text-sm">{error}</p>
                  </div>
                </div>
              ) : reportData && reportData.sections.length > 0 ? (
                <div className="appraisal-adjustments-panels flex flex-col gap-2">
                  <div className="flex flex-row gap-2">
                    {[0, 1, 2].map((colIndex) => (
                      <div key={colIndex} className="flex-1 flex flex-col gap-2">
                        {reportData.sections
                          .filter((_, index) => index % 3 === colIndex)
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
                  <p className="text-gray-400 text-lg">No condition report data available</p>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};
