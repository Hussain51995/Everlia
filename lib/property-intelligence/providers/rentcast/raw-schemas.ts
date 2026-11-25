import { z } from "zod";


const optionalNumber = z.union([z.number(), z.string(), z.null()]).optional();
const optionalString = z.union([z.string(), z.null()]).optional();

export const rentCastPropertyCoreSchema = z
  .object({
    id: optionalString,
    formattedAddress: optionalString,
    addressLine1: optionalString,
    addressLine2: optionalString,
    city: optionalString,
    state: optionalString,
    zipCode: optionalString,
    county: optionalString,
    latitude: optionalNumber,
    longitude: optionalNumber,
    propertyType: optionalString,
    bedrooms: optionalNumber,
    bathrooms: optionalNumber,
    squareFootage: optionalNumber,
    lotSize: optionalNumber,
    yearBuilt: optionalNumber,
    lastSaleDate: optionalString,
    lastSalePrice: optionalNumber,
  })
  .passthrough();

export const rentCastPropertyRecordSchema = rentCastPropertyCoreSchema;

export const rentCastPropertyRecordsResponseSchema = z.union([
  z.array(rentCastPropertyRecordSchema),
  rentCastPropertyRecordSchema,
]);

export const rentCastComparableSchema = rentCastPropertyCoreSchema
  .extend({
    status: optionalString,
    price: optionalNumber,
    listingType: optionalString,
    listedDate: optionalString,
    removedDate: optionalString,
    lastSeenDate: optionalString,
    daysOnMarket: optionalNumber,
    distance: optionalNumber,
    correlation: optionalNumber,
  })
  .passthrough();

export const rentCastValueEstimateSchema = z
  .object({
    price: optionalNumber,
    priceRangeLow: optionalNumber,
    priceRangeHigh: optionalNumber,
    subjectProperty: rentCastPropertyCoreSchema.optional().nullable(),
    comparables: z.array(rentCastComparableSchema).optional().nullable(),
  })
  .passthrough();

export const rentCastSaleListingSchema = rentCastComparableSchema;

export const rentCastSaleListingsResponseSchema = z.union([
  z.array(rentCastSaleListingSchema),
  z
    .object({
      listings: z.array(rentCastSaleListingSchema).optional(),
      data: z.array(rentCastSaleListingSchema).optional(),
    })
    .passthrough(),
]);

const rentCastMarketMetricsSchema = z
  .object({
    averagePrice: optionalNumber,
    medianPrice: optionalNumber,
    minPrice: optionalNumber,
    maxPrice: optionalNumber,
    averagePricePerSquareFoot: optionalNumber,
    medianPricePerSquareFoot: optionalNumber,
    averageSquareFootage: optionalNumber,
    medianSquareFootage: optionalNumber,
    averageDaysOnMarket: optionalNumber,
    medianDaysOnMarket: optionalNumber,
    totalListings: optionalNumber,
    newListings: optionalNumber,
  })
  .passthrough();

export const rentCastMarketHistoryEntrySchema = z
  .object({
    date: optionalString,
    ...rentCastMarketMetricsSchema.shape,
  })
  .passthrough();

const rentCastMarketHistorySchema = z
  .union([
    z.array(rentCastMarketHistoryEntrySchema),
    z.record(z.string(), rentCastMarketHistoryEntrySchema),
  ])
  .optional()
  .nullable();

export const rentCastMarketDataBlockSchema = rentCastMarketMetricsSchema
  .extend({
    history: rentCastMarketHistorySchema,
    averageRent: optionalNumber,
    medianRent: optionalNumber,
    minRent: optionalNumber,
    maxRent: optionalNumber,
    averageRentPerSquareFoot: optionalNumber,
    medianRentPerSquareFoot: optionalNumber,
  })
  .passthrough();

export const rentCastMarketsResponseSchema = z
  .object({
    id: optionalString,
    zipCode: optionalString,
    saleData: rentCastMarketDataBlockSchema.optional().nullable(),
    rentalData: rentCastMarketDataBlockSchema.optional().nullable(),
    averagePrice: optionalNumber,
    medianPrice: optionalNumber,
    history: rentCastMarketHistorySchema,
  })
  .passthrough();

export type RentCastPropertyCore = z.infer<typeof rentCastPropertyCoreSchema>;
export type RentCastValueEstimate = z.infer<typeof rentCastValueEstimateSchema>;
export type RentCastSaleListing = z.infer<typeof rentCastSaleListingSchema>;
export type RentCastMarketsResponse = z.infer<
  typeof rentCastMarketsResponseSchema
>;
