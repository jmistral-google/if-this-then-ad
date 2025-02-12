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
/**
 * Copyright 2025 Google LLC
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
import { GoogleAdsApiClient } from './google_ads_client';
import { ServiceAccount } from '../helpers/auth';

export interface CampaignDao {
  /**
   * Disable any and all CVRs for the provided list of campaigns.
   *
   * @param {string[]} campaignResourceNames List of campaing resource names
   */
  disableAllCvrsForCampaigns(campaignResourceNames: string[]): void;

  /**
   * Will create or update campaign CVRs for the provided campaigns.
   *
   * @param {string[]} campaignResourceNames List of campaing resource names
   * @param {number} conversionWeight Weight to use in the created/updated CVR
   * @param {geo} geo Geo to use in the created/update CVR
   */
  persistCvrForCampaigns(
    campaignResourceNames: string[],
    conversionWeight: number,
    geoTargetName: string
  ): void;
}

export class EmptyCampaignDaoImpl implements CampaignDao {
  customerId: string;

  constructor(customerId: string) {
    this.customerId = customerId;
  }

  persistCvrForCampaigns(
    campaignResourceNames: string[],
    conversionWeight: number,
    geo: string
  ): void {
    console.log(
      `Adding/Updating CVRs:  geo = ${geo}, weight = ${conversionWeight}, campaigns = ${campaignResourceNames}`
    );
  }

  disableAllCvrsForCampaigns(campaignResourceNames: string[]): void {
    console.log(`Disabling all CVRs:  campaigns = ${campaignResourceNames}`);
  }
}

export class GoogleAdsApiCampaignDaoImpl implements CampaignDao {
  customerId: string;
  apiClient: GoogleAdsApiClient;

  constructor(
    customerId: string,
    developerToken: string,
    serviceAccount: ServiceAccount | undefined,
    loginCustomerId: string | undefined
  ) {
    this.customerId = customerId;
    this.apiClient = new GoogleAdsApiClient(
      this.customerId,
      developerToken,
      serviceAccount,
      loginCustomerId
    );
  }

  // 1. Get the geo target resource
  // 2. Iterate over the list of campaign resource names
  // 3. Get the Conversion Value Rule Sets for the given resource name
  // 4. Get the Conversion Value Rule given the resource name and the geo target resource name. If it exists, update the value.
  //  If it doens't exist, then create it and then associate it with conversion value rule set.
  // 5. If the conversion value rule set doesn't exist, then create the conversion value rule and then create the rule set.
  persistCvrForCampaigns(
    campaignResourceNames: string[],
    conversionWeight: number,
    geoTargetName: string
  ): void {
    console.log(
      `Adding/Updating CVRs:  geo = ${geoTargetName}, weight = ${conversionWeight}, campaigns = ${campaignResourceNames}`
    );
    const geoTargetResource = this.getGeoTargetByName(
      this.customerId,
      geoTargetName
    );
    // TODO(baohle): Refine try/catch block. Currently too long.
    try {
      campaignResourceNames.forEach(campaignResourceName => {
        const existingRuleSet = this.getConversionValueRuleSetForCampaign(
          this.customerId,
          campaignResourceName
        );
        if (existingRuleSet && existingRuleSet.length > 0) {
<<<<<<< HEAD
          const existingRules =
            existingRuleSet[0].conversionValueRuleSet.conversionValueRules;
          let cvrForGeoExists = false;
          let cvrForGeoResourceName = '';
          for (const cvrResourceName of existingRules) {
            const cvrGeoTarget = this.getGeoTargetForConversionValueRule(
              this.customerId,
              cvrResourceName
            );
=======
          const conversionValueRuleSet =
            existingRuleSet[0].conversionValueRuleSet;
          const existingRules = conversionValueRuleSet.conversionValueRules;
          let cvrForGeoExists = false;
          let cvrForGeoResourceName = '';
          let ruleValue = 0;
          for (const cvrResourceName of existingRules) {
            const currentCVR = this.getConversionValueRule(
              this.customerId,
              cvrResourceName
            );
            const cvrGeoTarget =
              currentCVR.geoLocationCondition.geoTargetConstants[0];
            ruleValue = currentCVR.action.value;
>>>>>>> 7798efe (If the cvr value is the same as the conversion weight, skip the updated.)
            if (cvrGeoTarget === geoTargetResource) {
              cvrForGeoExists = true;
              cvrForGeoResourceName = cvrResourceName;
              break;
            }
          }
          if (cvrForGeoExists) {
<<<<<<< HEAD
            this.updateConversionValueRule(
              this.customerId,
              cvrForGeoResourceName,
              conversionWeight
            );
=======
            if (ruleValue !== conversionWeight) {
              this.updateConversionValueRule(
                this.customerId,
                cvrForGeoResourceName,
                conversionWeight
              );
            } else {
              console.log(
                'ConversionValueRule Value is the same. Update not required.'
              );
            }
>>>>>>> 7798efe (If the cvr value is the same as the conversion weight, skip the updated.)
          } else {
            const newCvr = this.createConversionValueRule(
              this.customerId,
              geoTargetResource,
              conversionWeight
            );
            this.updateConversionValueRuleSet(
              this.customerId,
<<<<<<< HEAD
              existingRuleSet.resourceName,
=======
              conversionValueRuleSet.resourceName,
>>>>>>> 7798efe (If the cvr value is the same as the conversion weight, skip the updated.)
              [...existingRules, newCvr]
            );
          }
        } else {
          console.log(
            `Conversion Value Rule Set not found for ${campaignResourceName}`
          );
          console.log(`Creating new conversion value rule`);
          const newCvr = this.createConversionValueRule(
            this.customerId,
            geoTargetResource,
            conversionWeight
          );
          console.log(
            `Creating CVR Set for campaign: ${campaignResourceName}.`
          );
          this.createConversionValueRuleSet(
            this.customerId,
            campaignResourceName,
            [newCvr]
          );
        }
      });
    } catch (error: any) {
      console.error('Error: ', error.stack);
    }
  }

  disableAllCvrsForCampaigns(campaignResourceNames: string[]): void {
    console.log(`Disabling all CVRs:  campaigns = ${campaignResourceNames}`);
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

    const payload = {
      query,
    };

    const path = `customers/${customerId}/googleAds:search`;
    const res = this.apiClient.makeApiCall(path, 'POST', payload, true);

    return res.results[0].geoTargetConstant.resourceName;
  }

  /**
   * Creates a ConversionValueRule that applies to the specified location.
   *
   * @param {string} customerId - The customer ID.
   * @param {string} geoTargetResource - The GeoTargetConstant resource name.
   * @param {number} value - The adjustment factor (e.g., 1.2 for a 20% increase).
   * @returns {string} - The resource name of the created ConversionValueRule.
   */
  private createConversionValueRule(
    customerId: string,
    geoTargetResource: string,
    value: number
  ): string {
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
    const res = this.apiClient.makeApiCall(path, 'POST', payload);
    const createdRuleResourceName = res.results[0]?.resourceName;

    console.log(`Created new CVR:  ${createdRuleResourceName}`);
    return createdRuleResourceName;
  }

  /**
   * Updates an existing ConversionValueRule with a new value.
   *
   * @param {string} customerId - The customer ID.
   * @param {string} resourceName - The resource name of the ConversionValueRule to update.
   * @param {number} value - The new adjustment factor.
   * @returns {string} - The resource name of the updated ConversionValueRule.
   */
  private updateConversionValueRule(
    customerId: string,
    resourceName: string,
    value: number
  ): string {
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
    const res = this.apiClient.makeApiCall(path, 'POST', payload);
    const updatedCvrResourceName = res.results[0]?.resourceName;

    console.log(`Updated CVR:  ${updatedCvrResourceName}`);
    return updatedCvrResourceName;
  }

  /**
   * Retrieves an existing ConversionValueRule for the specified GeoTargetConstant.
   *
   * @param {string} customerId - The customer ID.
   * @param {string} geoTargetResource - The GeoTargetConstant resource name.
   * @returns {any[]} - An array of matching ConversionValueRules.
   */
  private getConversionValueRuleForLocation(
    customerId: string,
    geoTargetResource: string
  ): string {
    const query = `
      SELECT
        conversion_value_rule.resource_name,
        conversion_value_rule.geo_location_condition.geo_target_constants
      FROM
        conversion_value_rule
      WHERE
        conversion_value_rule.geo_location_condition.geo_target_constants CONTAINS ANY ('${geoTargetResource}')
    `;

    const payload = {
      query,
    };

    const path = `customers/${customerId}/googleAds:search`;
    const res = this.apiClient.makeApiCall(path, 'POST', payload, true);

    if (res.results) {
      return res.results[0].conversionValueRule.resourceName;
    } else {
      return '';
    }
  }

  /**
   * Creates a ConversionValueRuleSet attached to a specific campaign.
   *
   * @param {string} customerId - The customer ID.
   * @param {string} campaignResourceName - The resource name of the campaign to attach the rule set to.
   * @param {string[]} conversionValueRuleResourceNames - The resource names of the ConversionValueRules to include in the set.
   * @returns {string} - The resource name of the created ConversionValueRuleSet.
   */
  private createConversionValueRuleSet(
    customerId: string,
    campaignResourceName: string,
    conversionValueRuleResourceNames: string[]
  ): string {
    // Construct the ConversionValueRuleSet operation payload.
    const payload = {
      operations: [
        {
          create: {
            // Attach the rule set to the specified campaign.
            campaign: campaignResourceName,
            attachmentType: 'CAMPAIGN', // Set attachment type to CAMPAIGN.
            // Add the ConversionValueRules to the set.
            conversionValueRules: conversionValueRuleResourceNames,
            // Add dimensions (e.g., GEO_LOCATION).
            dimensions: ['GEO_LOCATION'],
          },
        },
      ],
    };
    const path = `customers/${customerId}/conversionValueRuleSets:mutate`;
    const res = this.apiClient.makeApiCall(path, 'POST', payload, true);
    if (res.results && res.results.length > 0) {
      console.log(
        `Created conversion value rule set: ${res.results[0].resourceName}`
      );
      return res.results[0].resourceName;
    } else {
      throw new Error('Failed to create ConversionValueRuleSet.');
    }
  }

  /**
   * Updates an existing ConversionValueRuleSet with new ConversionValueRules.
   *
   * @param {string} customerId - The customer ID.
   * @param {string} ruleSetResourceName - The resource name of the ConversionValueRuleSet to update.
   * @param {string} newConversionValueRuleResourceNames - An array of resource names of new ConversionValueRules to add or replace existing ones.
   * @returns {string} - The resource name of the updated ConversionValueRuleSet.
   */
  private updateConversionValueRuleSet(
    customerId: string,
    ruleSetResourceName: string,
    newConversionValueRuleResourceNames: string[]
  ): string {
    // Construct the ConversionValueRuleSet operation payload.
    const payload = {
      operations: [
        {
          update: {
            resourceName: ruleSetResourceName,
            conversionValueRules: newConversionValueRuleResourceNames, // Use the provided array
          },
          updateMask: 'conversion_value_rules',
        },
      ],
    };

    const path = `customers/${customerId}/conversionValueRuleSets:mutate`;
    const res = this.apiClient.makeApiCall(path, 'POST', payload);
    const updatedCvrSetResourceName = res.results?.[0].resourceName;
    console.log(`Updated CVR set: ${updatedCvrSetResourceName}`);
    return updatedCvrSetResourceName;
  }

  /**
   * Retrieves an existing ConversionValueRuleSet for the specified campaign.
   *
   * @param {string} customerId - The customer ID.
   * @param {string} campaignResourceName - The resource name of the campaign.
   * @returns {any} - The matching ConversionValueRuleSet object.
   */
  private getConversionValueRuleSetForCampaign(
    customerId: string,
    campaignResourceName: string
  ): any {
    const query = `
      SELECT
        conversion_value_rule_set.resource_name,
        conversion_value_rule_set.campaign,
        conversion_value_rule_set.conversion_value_rules
      FROM
        conversion_value_rule_set
      WHERE
        conversion_value_rule_set.campaign = '${campaignResourceName}'
    `;
    const payload = {
      query,
    };

    const path = `customers/${customerId}/googleAds:search`;
    const res = this.apiClient.makeApiCall(path, 'POST', payload, true);

    // Return the first result (assuming only one rule set exists per campaign).
    return res.results;
  }

  /**
   * Retrieves the GeoTargetConstant resource name associated with a ConversionValueRule.
   *
   * @param {string} customerId - The customer ID.
   * @param {string} cvrResourceName - The resource name of the ConversionValueRule.
   * @returns {string} - The GeoTargetConstant resource name.
   */
  private getConversionValueRule(
    customerId: string,
    cvrResourceName: string
  ): any {
    const query = `
      SELECT
        conversion_value_rule.geo_location_condition.geo_target_constants,
        conversion_value_rule.action.value
      FROM
        conversion_value_rule
      WHERE
        conversion_value_rule.resource_name = '${cvrResourceName}'
    `;

    const payload = {
      query,
    };

    const path = `customers/${customerId}/googleAds:search`;
    const res = this.apiClient.makeApiCall(path, 'POST', payload, true);

    // Assuming the CVR has only one geo target constant
    if (!(res.results && res.results.length)) {
      throw new Error(`ConversionValueRule ${cvrResourceName} not found`);
    }
<<<<<<< HEAD
    return res.results[0].conversionValueRule.geoLocationCondition
      .geoTargetConstants[0];
=======
    return res.results[0].conversionValueRule;
>>>>>>> 7798efe (If the cvr value is the same as the conversion weight, skip the updated.)
  }
}
