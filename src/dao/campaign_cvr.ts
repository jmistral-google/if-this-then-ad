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
    geo: string
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
