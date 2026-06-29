import type { ConditionReportData } from '../../components/molecules/ConditionReport/ConditionReportModal';

export const CONDITION_REPORT_TEMP_DATA: ConditionReportData = {
    "sections": [
        {
            "type": "appraisal-odometer-panel",
            "dataQa": "Odometer",
            "title": "Odometer",
            "subtitle": "Base Odometer  60,000",
            "headerPrice": "$0",
            "panelClass": "has-subtitle",
            "icon": null,
            "lineItems": [
                {
                    "text": "60,000 Miles",
                    "price": "$0",
                    "priceClass": "zero",
                    "itemClass": null,
                    "selected": true
                }
            ],
            "unselectedItems": [],
            "specialData": {},
            "headerPriceClass": "zero"
        },
        {
            "type": "appraisal-options-panel",
            "dataQa": "Options",
            "title": "Options",
            "subtitle": null,
            "headerPrice": "-$450",
            "panelClass": "negative",
            "icon": null,
            "lineItems": [
                {
                    "text": "WITHOUT NAVIGATION",
                    "price": "-$1,250",
                    "priceClass": "negative zero-neutral",
                    "itemClass": "negative zero",
                    "selected": true
                },
                {
                    "text": "19\" WHEELS",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "not-selected",
                    "selected": false
                },
                {
                    "text": "BLACK OPTIC PKG (INCL'S 19\" WHEELS)",
                    "price": "+$500",
                    "priceClass": "zero-neutral positive",
                    "itemClass": "positive zero",
                    "selected": true
                },
                {
                    "text": "VENTED SEATS",
                    "price": "+$300",
                    "priceClass": "zero-neutral positive",
                    "itemClass": "positive zero",
                    "selected": true
                }
            ],
            "unselectedItems": [
                "19\" WHEELS"
            ],
            "specialData": {},
            "headerPriceClass": "negative"
        },
        {
            "type": "appraisal-vehicle-history-panel",
            "dataQa": "Vehicle History",
            "title": "Vehicle History",
            "subtitle": null,
            "headerPrice": "$0",
            "panelClass": null,
            "icon": null,
            "lineItems": [
                {
                    "text": "Bad VHR",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "not-selected",
                    "selected": false
                },
                {
                    "text": "No Frame Damage",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "not-selected",
                    "selected": false
                }
            ],
            "unselectedItems": [
                "Bad VHR"
            ],
            "specialData": {},
            "headerPriceClass": "zero"
        },
        {
            "type": "appraisal-owner-panel",
            "dataQa": "Original Owner",
            "title": "Original Owner",
            "subtitle": null,
            "headerPrice": "+$200",
            "panelClass": "positive",
            "icon": null,
            "lineItems": [
                {
                    "text": "1 Owner",
                    "price": "+$200",
                    "priceClass": "zero-neutral positive",
                    "itemClass": "positive",
                    "selected": true
                }
            ],
            "unselectedItems": [],
            "specialData": {},
            "headerPriceClass": "positive"
        },
        {
            "type": "appraisal-colors-panel",
            "dataQa": "Color",
            "title": "Color",
            "subtitle": null,
            "headerPrice": "$0",
            "panelClass": null,
            "icon": null,
            "lineItems": [
                {
                    "text": "Exterior - Unknown",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "zero",
                    "selected": true
                },
                {
                    "text": "Interior - Unknown",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "zero",
                    "selected": true
                }
            ],
            "unselectedItems": [],
            "specialData": {},
            "headerPriceClass": "zero"
        },
        {
            "type": "appraisal-keys-panel",
            "dataQa": "Keys",
            "title": "Keys",
            "subtitle": null,
            "headerPrice": "$0",
            "panelClass": null,
            "icon": null,
            "lineItems": [
                {
                    "text": "N/A",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": null,
                    "selected": true
                }
            ],
            "unselectedItems": [],
            "specialData": {},
            "headerPriceClass": "zero"
        },
        {
            "type": "appraisal-service-status-panel",
            "dataQa": "Service Status",
            "title": "Service Status",
            "subtitle": null,
            "headerPrice": "$0",
            "panelClass": null,
            "icon": null,
            "lineItems": [
                {
                    "text": "Certified Used Car",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "isPrecertified zero not-selected",
                    "selected": false
                },
                {
                    "text": "As Traded",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "asTraded zero not-selected",
                    "selected": false
                },
                {
                    "text": "Flunked Shop",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "flunkedShopDeduction zero not-selected",
                    "selected": false
                },
                {
                    "text": "Service Records",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "isServiced zero not-selected",
                    "selected": false
                },
                {
                    "text": "Extended Warranty",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "extendedWarranty zero not-selected",
                    "selected": false
                },
                {
                    "text": "Protection Package",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "protectionPackage zero not-selected",
                    "selected": false
                },
                {
                    "text": "Under Warranty",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "underWarranty zero not-selected",
                    "selected": false
                },
                {
                    "text": "VIP Program",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "vipProgram zero not-selected",
                    "selected": false
                }
            ],
            "unselectedItems": [
                "Certified Used Car",
                "As Traded",
                "Flunked Shop",
                "Service Records",
                "Extended Warranty",
                "Protection Package",
                "Under Warranty",
                "VIP Program"
            ],
            "specialData": {},
            "headerPriceClass": "zero"
        },
        {
            "type": "appraisal-damage-panel",
            "dataQa": "Body",
            "title": "Body Damage",
            "subtitle": null,
            "headerPrice": "$0",
            "panelClass": null,
            "icon": "assets/images/condition-items/body.svg",
            "lineItems": [],
            "unselectedItems": [],
            "specialData": {
                "graphicType": "body",
                "damageItems": [],
                "noDamage": true,
                "noDamageText": "No Damage"
            },
            "headerPriceClass": "zero"
        },
        {
            "type": "appraisal-damage-panel",
            "dataQa": "Interior",
            "title": "Interior Damage",
            "subtitle": null,
            "headerPrice": "$0",
            "panelClass": null,
            "icon": "assets/images/condition-items/interior.svg",
            "lineItems": [],
            "unselectedItems": [],
            "specialData": {
                "graphicType": "interior",
                "damageItems": [],
                "noDamage": true,
                "noDamageText": "No Damage"
            },
            "headerPriceClass": "zero"
        },
        {
            "type": "appraisal-damage-panel",
            "dataQa": "Glass",
            "title": "Glass Damage",
            "subtitle": null,
            "headerPrice": "$0",
            "panelClass": null,
            "icon": "assets/images/condition-items/glass.svg",
            "lineItems": [],
            "unselectedItems": [],
            "specialData": {
                "graphicType": "glass",
                "damageItems": [],
                "noDamage": true,
                "noDamageText": "No Damage"
            },
            "headerPriceClass": "zero"
        },
        {
            "type": "appraisal-tires-panel",
            "dataQa": "Tire/Wheel",
            "title": "Tire/Wheel",
            "subtitle": null,
            "headerPrice": "$0",
            "panelClass": null,
            "icon": "assets/images/condition-items/tires.svg",
            "lineItems": [],
            "unselectedItems": [
                "curb rash",
                "non-standard wheel",
                "replace wheel",
                "oxidized",
                "mismatched",
                "hubcap missing",
                "replace tire"
            ],
            "specialData": {
                "tread": [
                    {
                        "title": "8/32 +",
                        "tires": [
                            {
                                "position": "FL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "FR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            }
                        ],
                        "price": "$0"
                    },
                    {
                        "title": "4/32 - 7/32",
                        "tires": [
                            {
                                "position": "FL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "FR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            }
                        ],
                        "price": "$0"
                    },
                    {
                        "title": "0 - 3/32",
                        "tires": [
                            {
                                "position": "FL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "FR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            }
                        ],
                        "price": "$0"
                    }
                ],
                "wheelIssues": [
                    {
                        "title": "curb rash",
                        "tires": [
                            {
                                "position": "FL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "FR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            }
                        ],
                        "price": "$0"
                    },
                    {
                        "title": "non-standard wheel",
                        "tires": [
                            {
                                "position": "FL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "FR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            }
                        ],
                        "price": "$0"
                    },
                    {
                        "title": "replace wheel",
                        "tires": [
                            {
                                "position": "FL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "FR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            }
                        ],
                        "price": "$0"
                    },
                    {
                        "title": "oxidized",
                        "tires": [
                            {
                                "position": "FL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "FR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            }
                        ],
                        "price": "$0"
                    },
                    {
                        "title": "mismatched",
                        "tires": [
                            {
                                "position": "FL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "FR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            }
                        ],
                        "price": "$0"
                    },
                    {
                        "title": "hubcap missing",
                        "tires": [
                            {
                                "position": "FL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "FR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            }
                        ],
                        "price": "$0"
                    },
                    {
                        "title": "replace tire",
                        "tires": [
                            {
                                "position": "FL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "FR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RL",
                                "circleClass": "circle",
                                "circleState": "normal"
                            },
                            {
                                "position": "RR",
                                "circleClass": "circle",
                                "circleState": "normal"
                            }
                        ],
                        "price": "$0"
                    }
                ]
            },
            "headerPriceClass": "zero"
        },
        {
            "type": "appraisal-lights-panel",
            "dataQa": "Warning Lights",
            "title": "Warning Lights",
            "subtitle": null,
            "headerPrice": "$0",
            "panelClass": null,
            "icon": "assets/images/condition-items/mechanical.svg",
            "lineItems": [
                {
                    "text": "ABS",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "abs zero not-selected",
                    "selected": false
                },
                {
                    "text": "Battery",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "battery zero not-selected",
                    "selected": false
                },
                {
                    "text": "Brake",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "brake zero not-selected",
                    "selected": false
                },
                {
                    "text": "Engine",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "engine zero not-selected",
                    "selected": false
                },
                {
                    "text": "Airbag/SRS",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "srs zero not-selected",
                    "selected": false
                },
                {
                    "text": "Suspension Fault",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "suspension zero not-selected",
                    "selected": false
                },
                {
                    "text": "TPMS",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "tpms zero not-selected",
                    "selected": false
                },
                {
                    "text": "Traction",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "tractioncontrol zero not-selected",
                    "selected": false
                },
                {
                    "text": "Driver Assistance Fault",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "warninglight zero not-selected",
                    "selected": false
                },
                {
                    "text": "Coolant",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "coolant zero not-selected",
                    "selected": false
                },
                {
                    "text": "4x4/Transfer Case",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "transferCase4x4 zero not-selected",
                    "selected": false
                },
                {
                    "text": "Hybrid Battery",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "hybridBattery zero not-selected",
                    "selected": false
                },
                {
                    "text": "Parking Sensor/ Warning Inop",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "parkingSensor zero not-selected",
                    "selected": false
                }
            ],
            "unselectedItems": [
                "ABS",
                "Battery",
                "Brake",
                "Engine",
                "Airbag/SRS",
                "Suspension Fault",
                "TPMS",
                "Traction",
                "Driver Assistance Fault",
                "Coolant",
                "4x4/Transfer Case",
                "Hybrid Battery",
                "Parking Sensor/ Warning Inop"
            ],
            "specialData": {},
            "headerPriceClass": "zero"
        },
        {
            "type": "appraisal-mechanical-panel",
            "dataQa": "Mechanical",
            "title": "Mechanical",
            "subtitle": null,
            "headerPrice": "$0",
            "panelClass": null,
            "icon": "assets/images/condition-items/mechanical.svg",
            "lineItems": [
                {
                    "text": "Roof Inop",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "sunMoonRoofDeduction zero not-selected",
                    "selected": false
                },
                {
                    "text": "Steering",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "steeringDeduction zero not-selected",
                    "selected": false
                },
                {
                    "text": "Suspension",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "suspensionDeduction zero not-selected",
                    "selected": false
                },
                {
                    "text": "Brakes",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "brakesDeduction zero not-selected",
                    "selected": false
                },
                {
                    "text": "Engine",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "engineBootomEndNoiseDeduction zero not-selected",
                    "selected": false
                },
                {
                    "text": "Exhaust",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "exhaustDeduction zero not-selected",
                    "selected": false
                },
                {
                    "text": "Electrical",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "electricalDeduction zero not-selected",
                    "selected": false
                },
                {
                    "text": "Transmission",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "transmission zero not-selected",
                    "selected": false
                },
                {
                    "text": "AC",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "acDeduction zero not-selected",
                    "selected": false
                },
                {
                    "text": "Oil Leak",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "oilLeakDeduction zero not-selected",
                    "selected": false
                },
                {
                    "text": "Head Gasket",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "headGasketDeduction zero not-selected",
                    "selected": false
                },
                {
                    "text": "Catalytic Converter",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "catalyticConverter zero not-selected",
                    "selected": false
                },
                {
                    "text": "Timing Chain",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "timingChain zero not-selected",
                    "selected": false
                },
                {
                    "text": "Top End Noise",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "topEndNoise zero not-selected",
                    "selected": false
                },
                {
                    "text": "Turbo",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "turbo zero not-selected",
                    "selected": false
                },
                {
                    "text": "Supercharger",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "supercharger zero not-selected",
                    "selected": false
                },
                {
                    "text": "Differential",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "differential zero not-selected",
                    "selected": false
                },
                {
                    "text": "Coolant Leak",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "coolantLeak zero not-selected",
                    "selected": false
                },
                {
                    "text": "4x4/Transfer Case",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "transferCase4x4 zero not-selected",
                    "selected": false
                },
                {
                    "text": "Convertible Top Inop",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "convertibleTopInop zero not-selected",
                    "selected": false
                },
                {
                    "text": "Engine Miss/Skip",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "engineMiss zero not-selected",
                    "selected": false
                },
                {
                    "text": "Hybrid Battery Bad",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "hybridBatteryBad zero not-selected",
                    "selected": false
                },
                {
                    "text": "Electric Drive Motors",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "electricDriveMotors zero not-selected",
                    "selected": false
                },
                {
                    "text": "O2 Sensor",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "o2Sensor zero not-selected",
                    "selected": false
                },
                {
                    "text": "Clutch",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "clutchDeduction zero not-selected",
                    "selected": false
                }
            ],
            "unselectedItems": [
                "Roof Inop",
                "Steering",
                "Suspension",
                "Brakes",
                "Engine",
                "Exhaust",
                "Electrical",
                "Transmission",
                "AC",
                "Oil Leak",
                "Head Gasket",
                "Catalytic Converter",
                "Timing Chain",
                "Top End Noise",
                "Turbo",
                "Supercharger",
                "Differential",
                "Coolant Leak",
                "4x4/Transfer Case",
                "Convertible Top Inop",
                "Engine Miss/Skip",
                "Hybrid Battery Bad",
                "Electric Drive Motors",
                "O2 Sensor",
                "Clutch"
            ],
            "specialData": {},
            "headerPriceClass": "zero"
        },
        {
            "type": "appraisal-aftermarket-panel",
            "dataQa": "Aftermarket Modifications",
            "title": "Aftermarket Modifications",
            "subtitle": null,
            "headerPrice": "$0",
            "panelClass": null,
            "icon": "assets/images/condition-items/aftermarket.svg",
            "lineItems": [
                {
                    "text": "Stereo",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "radio zero not-selected",
                    "selected": false
                },
                {
                    "text": "Performance",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "performanceMods zero not-selected",
                    "selected": false
                },
                {
                    "text": "Wheel/Tire",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "wheels zero not-selected",
                    "selected": false
                },
                {
                    "text": "Suspension Lowered",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "suspensionLowered zero not-selected",
                    "selected": false
                },
                {
                    "text": "Sunroof/Moonroof",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "sunroofMoonroof zero not-selected",
                    "selected": false
                },
                {
                    "text": "Aftermarket Tint",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "windowTint zero not-selected",
                    "selected": false
                },
                {
                    "text": "Exhaust",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "exhaustMods zero not-selected",
                    "selected": false
                },
                {
                    "text": "Spoiler",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "spoiler zero not-selected",
                    "selected": false
                }
            ],
            "unselectedItems": [
                "Stereo",
                "Performance",
                "Wheel/Tire",
                "Suspension Lowered",
                "Sunroof/Moonroof",
                "Aftermarket Tint",
                "Exhaust",
                "Spoiler"
            ],
            "specialData": {},
            "headerPriceClass": "zero"
        },
        {
            "type": "appraisal-disclosures-panel",
            "dataQa": "Disclosures",
            "title": "Disclosures",
            "subtitle": null,
            "headerPrice": "$0",
            "panelClass": null,
            "icon": "assets/images/condition-items/other.svg",
            "lineItems": [
                {
                    "text": "Previous Canadian",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "isPrevCAChecked zero not-selected",
                    "selected": false
                },
                {
                    "text": "Smoke/Odor",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "isOdorChecked zero not-selected",
                    "selected": false
                },
                {
                    "text": "Airbag Previously Deployed",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "airbagDeployed zero not-selected",
                    "selected": false
                },
                {
                    "text": "Open Recalls",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "openRecalls zero not-selected",
                    "selected": false
                },
                {
                    "text": "Previous Rental/Fleet",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "prevRental zero not-selected",
                    "selected": false
                },
                {
                    "text": "Previous Livery/Uber",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "isLiveryChecked zero not-selected",
                    "selected": false
                },
                {
                    "text": "Registered at auction in the past 45 days",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "atAuction zero not-selected",
                    "selected": false
                },
                {
                    "text": "Previously Arbitrated",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "prevARB zero not-selected",
                    "selected": false
                },
                {
                    "text": "Salvage",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "salvage zero not-selected",
                    "selected": false
                },
                {
                    "text": "Lemon Laws",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "isBuyBackChecked zero not-selected",
                    "selected": false
                },
                {
                    "text": "Water Damage",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "isFloodDamage zero not-selected",
                    "selected": false
                },
                {
                    "text": "Fire Damage",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "isFireDamage zero not-selected",
                    "selected": false
                },
                {
                    "text": "Stolen/Recovered",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "wasStolen zero not-selected",
                    "selected": false
                },
                {
                    "text": "Hail Damage",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "isHailDamage zero not-selected",
                    "selected": false
                },
                {
                    "text": "Airbag Currently Deployed",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "airbagCurrentlyDeployed zero not-selected",
                    "selected": false
                },
                {
                    "text": "TMU",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "tmu zero not-selected",
                    "selected": false
                },
                {
                    "text": "Light Rust",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "lightRust zero not-selected",
                    "selected": false
                },
                {
                    "text": "Medium Rust",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "mediumRust zero not-selected",
                    "selected": false
                },
                {
                    "text": "Heavy Rust",
                    "price": "$0",
                    "priceClass": "zero zero-neutral",
                    "itemClass": "heavyRust zero not-selected",
                    "selected": false
                }
            ],
            "unselectedItems": [
                "Previous Canadian",
                "Smoke/Odor",
                "Airbag Previously Deployed",
                "Open Recalls",
                "Previous Rental/Fleet",
                "Previous Livery/Uber",
                "Registered at auction in the past 45 days",
                "Previously Arbitrated",
                "Salvage",
                "Lemon Laws",
                "Water Damage",
                "Fire Damage",
                "Stolen/Recovered",
                "Hail Damage",
                "Airbag Currently Deployed",
                "TMU",
                "Light Rust",
                "Medium Rust",
                "Heavy Rust"
            ],
            "specialData": {},
            "headerPriceClass": "zero"
        },
        {
            "type": "appraisal-obd-panel",
            "dataQa": "Obd",
            "title": "OBD Error Codes",
            "subtitle": null,
            "headerPrice": null,
            "panelClass": "positive",
            "icon": null,
            "lineItems": [],
            "unselectedItems": [],
            "specialData": {
                "hasIssues": false,
                "issues": [],
                "noIssuesText": "No Issues Found"
            },
            "headerPriceClass": "positive"
        }
    ],
    "keyValuePairs": {
        "Odometer": "$0",
        "Options": "-$450",
        "Vehicle History": "$0",
        "Original Owner": "+$200",
        "Color": "$0",
        "Keys": "$0",
        "Service Status": "$0",
        "Body Damage": "$0",
        "Interior Damage": "$0",
        "Glass Damage": "$0",
        "Tire/Wheel": "$0",
        "Warning Lights": "$0",
        "Mechanical": "$0",
        "Aftermarket Modifications": "$0",
        "Disclosures": "$0",
        "OBD Error Codes": "N/A"
    }
}