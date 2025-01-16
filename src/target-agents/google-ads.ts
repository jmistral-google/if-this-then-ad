/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Auth, ServiceAccount } from '../helpers/auth';
import { TargetAgent } from './base';
import { CampaignDao, EmptyCampaignDaoImpl } from '../dao/campaign_cvr';

// Lower bound of the CVR adjustment.  Ie, a CVR can not lower a conversion
// beyond 50% less than it's original value.
const CVR_ADJUSTMENT_LOWER_BOUND = -0.5;

// Upper bound of the CVR adjustment.  Ie, a CVR can not raise a conversion
// beyond 1000% more than it's original value.
const CVR_ADJUSTMENT_UPPER_BOUND = 10.0;

// Lower bound of the CVR adjustment.  Ie, a CVR can not lower a conversion
// beyond 50% less than it's original value.
const CVR_ADJUSTMENT_LOWER_BOUND = -0.5;

// Upper bound of the CVR adjustment.  Ie, a CVR can not raise a conversion
// beyond 1000% more than it's original value.
const CVR_ADJUSTMENT_UPPER_BOUND = 10.0;

export enum GOOGLE_ADS_SELECTOR_TYPE {
  AD_ID = 'AD_ID',
  AD_LABEL = 'AD_LABEL',
  AD_GROUP_ID = 'AD_GROUP_ID',
  AD_GROUP_LABEL = 'AD_GROUP_LABEL',
  CAMPAIGN_LABEL = 'CAMPAIGN_LABEL',
  CAMPAIGN_ID = 'CAMPAIGN_ID',
}

export enum GOOGLE_ADS_ENTITY_STATUS {
  ENABLED = 'ENABLED',
  PAUSED = 'PAUSED',
}

export enum GOOGLE_ADS_ACTION {
  TOGGLE = 'Enable/Pause',
  MANAGE_CONV_VALUE_RULE = 'Manage Conv. Value Rule',
}

interface Parameters {
  customerId: string;
  developerToken: string;
  loginCustomerId?: string;
  serviceAccount?: ServiceAccount;
  geo?: string;
  conversionWeight?: number;
}

interface Entity {
  resourceName: string;
  status: GOOGLE_ADS_ENTITY_STATUS;
}

export class GoogleAds extends TargetAgent {
  static friendlyName = 'Google Ads';
  authToken?: string;
  parameters: Parameters = {} as Parameters;
  baseUrl: string;
  requiredParameters: Array<keyof Parameters> = [
    'customerId',
    'developerToken',
  ];

  constructor() {
    super();

    this.baseUrl = 'https://googleads.googleapis.com/v18';
  }

  /**
   * Process entity based on evaluation.
   *
   * @param {string} identifier
   * @param {GOOGLE_ADS_SELECTOR_TYPE} type
   * @param {GOOGLE_ADS_ACTION} action
   * @param {boolean} evaluation
   * @param {Parameters} params Additional parameters
   */
  process(
    identifier: string,
    type: GOOGLE_ADS_SELECTOR_TYPE,
    action: GOOGLE_ADS_ACTION,
    evaluation: boolean,
    params: Parameters
  ) {
    // Check for missing parameters
    this.ensureRequiredParameters(params);

    const auth = new Auth(params.serviceAccount ?? undefined);
    this.authToken = auth.getAuthToken();

    this.parameters = params;

    if (action === GOOGLE_ADS_ACTION.TOGGLE) {
      return this.handleToggle(identifier, type, evaluation, params);
    } else if (action === GOOGLE_ADS_ACTION.MANAGE_CONV_VALUE_RULE) {
      this.handleManageConversionRule(identifier, type, evaluation, params);
    } else {
      throw new Error(
        `Action '${action}' not supported in '${GoogleAds.friendlyName}' agent`
      );
    }
  }

  /**
   * Handle toggle action
   *
   * @param {string} identifier
   * @param {GOOGLE_ADS_SELECTOR_TYPE} type
   * @param {boolean} evaluation
   * @param {Parameters} params Additional parameters
   */
  handleToggle(
    identifier: string,
    type: GOOGLE_ADS_SELECTOR_TYPE,
    evaluation: boolean,
    params: Parameters
  ) {
    console.log(`Identifier type = ${typeof identifier}`);

    const status = evaluation
      ? GOOGLE_ADS_ENTITY_STATUS.ENABLED
      : GOOGLE_ADS_ENTITY_STATUS.PAUSED;

    if (type === GOOGLE_ADS_SELECTOR_TYPE.AD_ID) {
      console.log(`Updating status of Ad ${identifier} to '${status}'`);
      this.updateAdStatusById(
        params.customerId,
        identifier.split(';').map(id => String(id)),
        status
      );
    } else if (type === GOOGLE_ADS_SELECTOR_TYPE.AD_LABEL) {
      this.updateAdStatusByLabel(params.customerId, identifier, status);
    } else if (type === GOOGLE_ADS_SELECTOR_TYPE.AD_GROUP_ID) {
      this.updateAdGroupStatusById(
        params.customerId,
        identifier.split(';').map(id => String(id)),
        status
      );
    } else if (type === GOOGLE_ADS_SELECTOR_TYPE.AD_GROUP_LABEL) {
      console.log(
        `Updating status of AdGroup by label '${identifier}' to '${status}'`
      );
      this.updateAdGroupStatusByLabel(params.customerId, identifier, status);
    } else if (type === GOOGLE_ADS_SELECTOR_TYPE.CAMPAIGN_ID) {
      this.updateCampaignStatusById(
        params.customerId,
        (identifier as string).split(';').map(id => String(id)),
        status
      );
    } else if (type === GOOGLE_ADS_SELECTOR_TYPE.CAMPAIGN_LABEL) {
      this.updateCampaignsByLabel(params.customerId, identifier, status);
    }
  }

  /**
   * Handles delegation of managing campaign CVRs.
   */
  private handleManageConversionRule(
    identifier: string,
    selectoryType: GOOGLE_ADS_SELECTOR_TYPE,
    evaluation: boolean,
    params: Parameters
  ) {
    if (params.conversionWeight === undefined) {
      throw new Error('The conversion weight target param was not provided.');
    }

    if (params.geo === undefined) {
      throw new Error('The geo target param value was not provided.');
    }

    const campaings: Entity[] =
      selectoryType === GOOGLE_ADS_SELECTOR_TYPE.CAMPAIGN_ID
        ? this.getCampaingsById(
            params.customerId,
            (identifier as string).split(';').map(id => String(id))
          )
        : this.getCampaignsByLabel(params.customerId, identifier);
    console.log(
      `Retrieved following campaigns to manage CVRs for:  ${campaings.map(
        campaign => campaign.resourceName
      )}`
    );

    // TODO:  Replace with real impl when completed.
    console.log(
      `Will create/update CVR?:  ${evaluation}, conv. weight ${params.conversionWeight}`
    );
    const campaignCvrDao = new EmptyCampaignDaoImpl(params.customerId);
    if (!evaluation) {
      campaignCvrDao.disableAllCvrsForCampaigns(
        campaings.map(entity => entity.resourceName)
      );
    } else {
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 9b5dcb4 (Added clamping logic to conversion weight.)
>>>>>>> 29340df (Added clamping logic to conversion weight.)
      // The DAO will create a multiplication CVR, where conversion values are
      // multiplied by the generated %.  NOTE:  Ads restricts multiplied
      // percentages be clamped between an lower and upper bound of 50% to 1000%
      const clampedAdjustment: number = Math.max(
        CVR_ADJUSTMENT_LOWER_BOUND,
        Math.min(params.conversionWeight, CVR_ADJUSTMENT_UPPER_BOUND)
      );
      const finalAdjustment: number = 1 + clampedAdjustment;

<<<<<<< HEAD
      campaignCvrDao.persistCvrForCampaigns(
        campaings.map(entity => entity.resourceName),
        finalAdjustment,
<<<<<<< HEAD
=======
=======
      campaignCvrDao.persistCvrForCampaigns(
        campaings.map(entity => entity.resourceName),
        params.conversionWeight,
>>>>>>> 2189313 (Implement manage CVR logic in Ads agent)
=======
      campaignCvrDao.persistCvrForCampaigns(
        campaings.map(entity => entity.resourceName),
        finalAdjustment,
>>>>>>> 9b5dcb4 (Added clamping logic to conversion weight.)
>>>>>>> 29340df (Added clamping logic to conversion weight.)
        params.geo
      );
    }
  }

  /**
   * Check if supposed entity status matches its actual live status.
   *
   * @param {string} identifier
   * @param {GOOGLE_ADS_SELECTOR_TYPE} type
   * @param {GOOGLE_ADS_ACTION} action
   * @param {boolean} evaluation
   * @param {Parameters} params Additional parameters
   * @returns {string[]}
   */
  validate(
    identifier: string,
    type: GOOGLE_ADS_SELECTOR_TYPE,
    action: GOOGLE_ADS_ACTION,
    evaluation: boolean,
    params: Parameters
  ) {
    const auth = new Auth(params.serviceAccount ?? undefined);
    this.authToken = auth.getAuthToken();

    this.parameters = params;

    const expectedStatus = evaluation
      ? GOOGLE_ADS_ENTITY_STATUS.ENABLED
      : GOOGLE_ADS_ENTITY_STATUS.PAUSED;
    let entitiesToBeChecked: Entity[] = [];
    const errors: string[] = [];

    if (type === GOOGLE_ADS_SELECTOR_TYPE.AD_ID) {
      entitiesToBeChecked = entitiesToBeChecked.concat(
        this.getAdsById(
          params.customerId,
          identifier.split(',').map(id => String(id))
        )
      );
    } else if (type === GOOGLE_ADS_SELECTOR_TYPE.AD_LABEL) {
      entitiesToBeChecked = entitiesToBeChecked.concat(
        this.getAdsByLabel(params.customerId, identifier)
      );
    } else if (type === GOOGLE_ADS_SELECTOR_TYPE.AD_GROUP_ID) {
      entitiesToBeChecked = entitiesToBeChecked.concat(
        this.getAdGroupsById(
          params.customerId,
          identifier.split(',').map(id => String(id))
        )
      );
    } else if (type === GOOGLE_ADS_SELECTOR_TYPE.AD_GROUP_LABEL) {
      entitiesToBeChecked = entitiesToBeChecked.concat(
        this.getAdGroupsByLabel(params.customerId, identifier)
      );
    }

    for (const entity of entitiesToBeChecked) {
      if (entity.status !== expectedStatus) {
        errors.push(
          `Status for ${identifier} (${type}) should be ${expectedStatus} but is ${entity.status}`
        );
      }
    }

    return errors;
  }

  /**
   * Update entity status.
   *
   * @param {string} path
   * @param {Entity} entity
   * @param {string} status
   */
  private updateEntityStatus(path: string, entity: Entity, status: string) {
    const payload = {
      operations: [
        {
          updateMask: 'status',
          update: {
            resourceName: entity.resourceName,
            status: status,
          },
        },
      ],
    };

    this.fetchUrl(path, 'POST', payload);
  }

  /**
   * Make an HTTP API request to the Ads API.
   *
   * @param {string} url - API endpoint to be requested
   * @param {string?} method - HTTP method, e.g. GET, PATCH, etc.
   * @param {Object|undefined} payload - What should be updated
   * @param {boolean} forceCache
   * @returns {JSON} Result of the operation
   */
  private fetchUrl(
    path: string,
    method = 'get',
    payload: Object,
    forceCache = false
  ) {
    const headers: GoogleAppsScript.URL_Fetch.HttpHeaders = {
      Authorization: `Bearer ${this.authToken}`,
      Accept: '*/*',
      'developer-token': this.parameters.developerToken ?? '',
    };

    if (this.parameters.loginCustomerId) {
      headers['login-customer-id'] = String(this.parameters.loginCustomerId);
    }

    const url = `${this.baseUrl}/${path}`;
    return this.callApi(
      url,
      headers,
      undefined,
      payload,
      method,
      undefined,
      forceCache
    );
  }

  /**
   * Update Ad status by ID(s).
   *
   * @param {string} customerId
   * @param {string[]} ids
   * @param {string} status
   */
  private updateAdStatusById(
    customerId: string,
    ids: string[],
    status: string
  ) {
    const ads = this.getAdsById(customerId, ids);
    const path = `customers/${customerId}/adGroupAds:mutate`;

    for (const ad of ads) {
      this.updateEntityStatus(path, ad, status);
    }
  }

  /**
   * Update AdGroup status by ID(s).
   *
   * @param {string} customerId
   * @param {string[]} ids
   * @param {string} status
   */
  private updateAdGroupStatusById(
    customerId: string,
    ids: string[],
    status: string
  ) {
    const adGroups = this.getAdGroupsById(customerId, ids);
    const path = `customers/${customerId}/adGroups:mutate`;

    for (const adGroup of adGroups) {
      this.updateEntityStatus(path, adGroup, status);
    }
  }

  /**
   * Updates a campaign's status by its ID.
   *
   * @param {string} customerId
   * @param {string[]} ids
   * @param {string} status
   */
  private updateCampaignStatusById(
    customerId: string,
    ids: string[],
    status: string
  ) {
    const campaigns = this.getCampaingsById(customerId, ids);

    const path = `customers/${customerId}/campaigns:mutate`;
    for (const campaign of campaigns) {
      this.updateEntityStatus(path, campaign, status);
    }
  }

  /**
   * Update Ad status by label.
   *
   * @param {string} customerId
   * @param {string} label
   * @param {string} status
   */
  private updateAdStatusByLabel(
    customerId: string,
    label: string,
    status: string
  ) {
    const ads = this.getAdsByLabel(customerId, label);
    const path = `customers/${customerId}/adGroupAds:mutate`;

    for (const ad of ads) {
      this.updateEntityStatus(path, ad, status);
    }
  }

  /**
   * Update AdGroup status by label.
   *
   * @param {string} customerId
   * @param {string} label
   * @param {string} status
   */
  private updateAdGroupStatusByLabel(
    customerId: string,
    label: string,
    status: string
  ) {
    const adGroups = this.getAdGroupsByLabel(customerId, label);

    const path = `customers/${customerId}/adGroups:mutate`;

    for (const adGroup of adGroups) {
      this.updateEntityStatus(path, adGroup, status);
    }
  }

  /**
   * Finds and updates the campaigns with the provided label.
   *
   * @param customerId
   * @param label
   * @param status
   */
  private updateCampaignsByLabel(
    customerId: string,
    label: string,
    status: string
  ) {
    const campaigns = this.getCampaignsByLabel(customerId, label);

    const path = `customers/${customerId}/campaigns:mutate`;
    for (const campaign of campaigns) {
      this.updateEntityStatus(path, campaign, status);
    }
  }

  /**
   * Get Ads status by ID(s).
   *
   * @param {string} customerId
   * @param {string[]} ids
   * @returns {string[]}
   */
  private getAdsById(customerId: string, ids: string[]): Entity[] {
    const query = `
        SELECT 
          ad_group_ad.ad.id,
          ad_group_ad.status
        FROM ad_group_ad
        WHERE 
          ad_group_ad.ad.id IN (${ids.join(',')})
      `;

    const payload = {
      query,
    };

    const path = `customers/${customerId}/googleAds:search`;
    const res = this.fetchUrl(path, 'POST', payload, true) as {
      results: Array<Record<'adGroupAd', Entity>>;
    };

    return res.results.map(result => {
      return {
        resourceName: result.adGroupAd.resourceName,
        status: result.adGroupAd.status,
      };
    });
  }

  /**
   * Get AdGroups status by ID(s).
   *
   * @param {string} customerId
   * @param {string[]} ids
   * @returns {Entity[]}
   */
  private getAdGroupsById(customerId: string, ids: string[]): Entity[] {
    const query = `
          SELECT
            ad_group.id,
            ad_group.status
          FROM ad_group
          WHERE
            ad_group.id IN (${ids.join(',')})
        `;

    const payload = {
      query,
    };

    const path = `customers/${customerId}/googleAds:search`;
    const res = this.fetchUrl(path, 'POST', payload, true) as {
      results: Array<Record<'adGroup', Entity>>;
    };

    return res.results.map(result => {
      return {
        resourceName: result.adGroup.resourceName,
        status: result.adGroup.status,
      };
    });
  }

  private getCampaingsById(customerId: string, ids: string[]): Entity[] {
    const query = `
      SELECT 
        campaign.id,
        campaign.status
      FROM campaign
      WHERE 
        campaign.id IN (${ids.join(',')})
    `;

    return this.getEntitiesByQuery(customerId, query, 'campaign');
  }

  /**
   * Retrieves an Ads entity using the provided query.
   *
   * @param {string} customerId Account ID to execute the query in.
   * @param {string} query GAQL query to execute.
   * @param {string} entityName Name of the ads entity in the query result set.
   * @returns {Entity[]} Entities found by the query.
   */
  private getEntitiesByQuery(
    customerId: string,
    query: string,
    entityName: string
  ): Entity[] {
    const payload = {
      query,
    };

    const path = `customers/${customerId}/googleAds:search`;
    const res = this.fetchUrl(path, 'POST', payload, true) as {
      results: Array<Record<string, Entity>>;
    };

    return res.results.map(result => {
      return {
        resourceName: result[entityName].resourceName,
        status: result[entityName]?.status,
      } as Entity;
    });
  }

  /**
   * Get Ads resource names by labels.
   *
   * @param {string} customerId
   * @param {string} label
   * @returns {Entity[]}
   */
  private getAdsByLabel(customerId: string, label: string): Entity[] {
    const labelResource = this.getAdLabelByName(customerId, label);

    const query = `
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.status
      FROM ad_group_ad
      WHERE 
        ad_group_ad.labels CONTAINS ANY ('${labelResource}')
    `;

    const payload = {
      query,
    };

    const path = `customers/${customerId}/googleAds:search`;
    const res = this.fetchUrl(path, 'POST', payload, true) as {
      results: Array<Record<'adGroupAd', Entity>>;
    };

    return res.results.map(result => {
      return {
        resourceName: result.adGroupAd.resourceName,
        status: result.adGroupAd.status,
      };
    });
  }

  /**
   * Get Ad label by name.
   *
   * @param {string} customerId
   * @param {string} labelName
   * @returns {string}
   */
  private getAdLabelByName(customerId: string, labelName: string) {
    const query = `
      SELECT 
        label.resource_name
      FROM ad_group_ad_label 
      WHERE 
        label.name = '${labelName}'
    `;

    const payload = {
      query,
    };

    const path = `customers/${customerId}/googleAds:search`;
    const res = this.fetchUrl(path, 'POST', payload, true) as {
      results: Array<Record<'label', Entity>>;
    };

    if (!(res.results && res.results.length)) {
      throw new Error(`Label ${labelName} not found`);
    }

    return res.results[0].label.resourceName;
  }

  /**
   * Get AdGroups resource names by labels.
   *
   * @param {string} customerId
   * @param {string} label
   * @returns {Entity[]}
   */
  private getAdGroupsByLabel(customerId: string, label: string): Entity[] {
    const labelResource = this.getAdGroupLabelByName(customerId, label);

    const query = `
      SELECT 
        ad_group.id,
        ad_group.status
      FROM ad_group 
      WHERE 
        ad_group.labels CONTAINS ANY ('${labelResource}')
    `;

    const payload = {
      query,
    };

    const path = `customers/${customerId}/googleAds:search`;
    const res = this.fetchUrl(path, 'POST', payload, true) as {
      results: Array<Record<'adGroup', Entity>>;
    };

    return res.results.map(result => {
      return {
        resourceName: result.adGroup.resourceName,
        status: result.adGroup.status,
      };
    });
  }

  /**
   * Get AdGroup label by name.
   *
   * @param {string} customerId
   * @param {string} labelName
   * @returns {string}
   */
  private getAdGroupLabelByName(customerId: string, labelName: string) {
    const query = `
      SELECT 
        label.resource_name
      FROM ad_group_label 
      WHERE 
        label.name = '${labelName}'
    `;

    const payload = {
      query,
    };

    const path = `customers/${customerId}/googleAds:search`;
    const res = this.fetchUrl(path, 'POST', payload, true) as {
      results: Array<Record<'label', Entity>>;
    };

    if (!(res.results && res.results.length)) {
      throw new Error(`Label ${labelName} not found`);
    }

    return res.results[0].label.resourceName;
  }

  /**
   * Retrieves 1 or more campaigns with the provided label.
   *
   * @param {string} customerId
   * @param {string} label
   * @returns {Entity[]}
   */
  private getCampaignsByLabel(customerId: string, label: string): Entity[] {
    const query = `
      SELECT
        campaign.resource_name,
        campaign.status
      FROM campaign_label
      WHERE
        label.name = '${label}'
    `;
    return this.getEntitiesByQuery(customerId, query, 'campaign');
  }

  /**
   * Retrieves the GeoTargetConstant resource name for a specific location.
   *
   * @param {string} customerId
   * @param {string} locationName
   * @returns {string}
   */
  private getGeoTargetByName(customerId: string, locationName: string): string {
    const query = `
      SELECT
        geo_target_constant.resource_name,
        geo_target_constant.name,
        geo_target_constant.country_code,
        geo_target_constant.target_type
      FROM
        geo_target_constant
      WHERE
        geo_target_constant.target_type = 'City'
        AND geo_target_constant.name = '${locationName}'
    `;

    const geoTargets = this.getEntitiesByQuery(customerId, query, 'geo_target_constant');
    return geoTargets[0].resourceName;
  }


  /**
   * Creates a ConversionValueRule that applies to the specified location.
   *
   * @param {string} customerId - The customer ID.
   * @param {string} geoTargetResource - The GeoTargetConstant resource name.
   * @param {number} value - The adjustment factor (e.g., 1.2 for a 20% increase).
   * @returns {string} - The resource name of the created ConversionValueRule.
   */
  private createConversionValueRule(customerId: string, geoTargetResource: string, value: number): string {
    // Construct the ConversionValueRule operation payload.
    const payload = {
      operations: [
        {
          create: {
            action: {
              operation: 'MULTIPLY', // Define the action type (e.g., MULTIPLY or ADD).
              value: value, // Use the provided adjustment factor.
            },
            geoLocationCondition: {
              geoTargetConstants: [geoTargetResource],
              geoMatchType: 'LOCATION_OF_PRESENCE', // Match based on location presence.
            },
          },
        },
      ],
    };

    const path = `customers/${customerId}/conversionValueRules:mutate`;
    const res = this.fetchUrl(path, 'POST', payload);
    const parsedResponse = JSON.parse(res.getContentText());
    return parsedResponse.results[0]?.resourceName;
  }

  /**
   * Updates an existing ConversionValueRule with a new value.
   *
   * @param {string} customerId - The customer ID.
   * @param {string} resourceName - The resource name of the ConversionValueRule to update.
   * @param {number} value - The new adjustment factor.
   * @returns {string} - The resource name of the updated ConversionValueRule.
   */
  private updateConversionValueRule(customerId: string, resourceName: string, value: number): string {
    const payload = {
      operations: [
        {
          update: {
            resourceName: resourceName,
            action: {
              operation: 'MULTIPLY',
              value: value,
            },
          },
          updateMask: 'action.value',
        },
      ],
    };

    const path = `customers/${customerId}/conversionValueRules:mutate`;
    const res = this.fetchUrl(path, 'POST', payload);
    const parsedResponse = JSON.parse(res.getContentText());
    return parsedResponse.results[0]?.resourceName;
  }

  /**
   * Retrieves an existing ConversionValueRule for the specified GeoTargetConstant.
   *
   * @param {string} customerId - The customer ID.
   * @param {string} geoTargetResource - The GeoTargetConstant resource name.
   * @returns {any[]} - An array of matching ConversionValueRules.
   */
  private getConversionValueRuleForLocation(customerId: string, geoTargetResource: string): any[] {
    const query = `
      SELECT
        conversion_value_rule.resource_name,
        conversion_value_rule.geo_location_condition.geo_target_constants
      FROM
        conversion_value_rule
      WHERE
        conversion_value_rule.geo_location_condition.geo_target_constants CONTAINS ANY ('${geoTargetResource}')
    `;

    return this.getEntitiesByQuery(customerId, query, 'conversion_value_rule');
  }

  /**
   * Creates or updates a ConversionValueRule for the specified location.
   *
   * @param {string} customerId - The customer ID.
   * @param {string} geoTargetName - The name of the geo target (e.g., a city).
   * @param {number} value - The adjustment factor (e.g., 1.2 for a 20% increase).
   * @returns {string} - The resource name of the created or updated ConversionValueRule.
   */
  private mutateConversionValueRule(customerId: string, geoTargetName: string, value: number): string {
    // Retrieve the GeoTargetConstant resource name for the provided geo target name.
    const geoTargetResource = this.getGeoTargetByName(customerId, geoTargetName);

    // Check if a ConversionValueRule exists for the location.
    const existingRules = this.getConversionValueRuleForLocation(customerId, geoTargetResource);

    if (existingRules.length > 0) {
      // Update the existing rule.
      return this.updateConversionValueRule(customerId, existingRules[0].resourceName, value);
    } else {
      // Create a new rule.
      return this.createConversionValueRule(customerId, geoTargetResource, value);
    }
  }
}
