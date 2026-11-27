
export type AltavistaRawDetails = {
  payload: {
    bundle: {
      av_property_id: string;
      situs: {
        full_line: string;
        locality: string;
        region_code: string;
        postal: string;
        nation: string;
      };
      home_facts: {
        bed_count: number;
        bath_count: number;
        living_sq_ft: number;
        lot_sq_ft: number;
        yr_built: number;
        structure_kind: string;
      };
      geo_county: string;
    };
  };
};

export type AltavistaRawValuation = {
  result_set: {
    avm_node: {
      value_usd: number;
      band_low_usd: number;
      band_high_usd: number;
      as_of: string;
      subject_av_id: string;
    };
  };
};

export type AltavistaRawMarket = {
  market_pack: {
    postal_key: string;
    sale_board: {
      avg_ask_usd: number;
      med_ask_usd: number;
      avg_dom: number;
      listing_total: number;
      listing_new: number;
      ask_per_sqft_usd: number;
    };
    history_rows: Array<{
      period_iso: string;
      avg_ask_usd: number;
      med_ask_usd: number;
    }>;
  };
};

export const ALTAVISTA_DETAILS_FIXTURE: AltavistaRawDetails = {
  payload: {
    bundle: {
      av_property_id: "AV-PROP-998877",
      situs: {
        full_line: "5500 Grand Lake Dr, San Antonio, TX 78244",
        locality: "San Antonio",
        region_code: "TX",
        postal: "78244",
        nation: "US",
      },
      home_facts: {
        bed_count: 4,
        bath_count: 3,
        living_sq_ft: 2100,
        lot_sq_ft: 8500,
        yr_built: 2001,
        structure_kind: "DetachedResidence",
      },
      geo_county: "Bexar",
    },
  },
};

export const ALTAVISTA_VALUATION_FIXTURE: AltavistaRawValuation = {
  result_set: {
    avm_node: {
      value_usd: 405000,
      band_low_usd: 380000,
      band_high_usd: 430000,
      as_of: "2026-01-15T00:00:00.000Z",
      subject_av_id: "AV-PROP-998877",
    },
  },
};

export const ALTAVISTA_MARKET_FIXTURE: AltavistaRawMarket = {
  market_pack: {
    postal_key: "78244",
    sale_board: {
      avg_ask_usd: 312000,
      med_ask_usd: 305000,
      avg_dom: 28,
      listing_total: 14,
      listing_new: 3,
      ask_per_sqft_usd: 165,
    },
    history_rows: [
      { period_iso: "2025-07-01T00:00:00.000Z", avg_ask_usd: 300000, med_ask_usd: 295000 },
      { period_iso: "2025-09-01T00:00:00.000Z", avg_ask_usd: 308000, med_ask_usd: 301000 },
      { period_iso: "2025-11-01T00:00:00.000Z", avg_ask_usd: 312000, med_ask_usd: 305000 },
    ],
  },
};
