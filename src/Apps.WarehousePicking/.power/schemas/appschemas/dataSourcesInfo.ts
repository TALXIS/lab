/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * This file is auto-generated. Do not modify it manually.
 * Changes to this file may be overwritten.
 */

export const dataSourcesInfo = {
  "lab_5fopen_20food_20facts_5f7aa971af9b65e431": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "GetProductByBarcode": {
        "path": "/{connectionId}/product/{barcode}.json",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "barcode",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "GetProductImage": {
        "path": "/{connectionId}/product-image",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "imageUrl",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "file"
          }
        }
      }
    }
  },
  "lab_products": {
    "tableId": "",
    "version": "",
    "primaryKey": "lab_productid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "lab_warehouseitems": {
    "tableId": "",
    "version": "",
    "primaryKey": "lab_warehouseitemid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "lab_warehouselocations": {
    "tableId": "",
    "version": "",
    "primaryKey": "lab_warehouselocationid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "lab_warehousetransactions": {
    "tableId": "",
    "version": "",
    "primaryKey": "lab_warehousetransactionid",
    "dataSourceType": "Dataverse",
    "apis": {}
  }
};
