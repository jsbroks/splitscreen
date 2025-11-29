/**
 * Fluent API Query Builder for VideoV1 Typesense Collection
 *
 * @example
 * ```ts
 * const query = new VideoQueryBuilder()
 *   .search("funny cats")
 *   .searchFields(["title", "description", "tag_names"])
 *   .whereApproved()
 *   .whereCreatorId("creator_123")
 *   .whereTags(["tag1", "tag2"])
 *   .sortBy("trending_score", "desc")
 *   .limit(20)
 *   .page(1)
 *   .build();
 * ```
 */

import type { SearchResponse } from "typesense/lib/Typesense/Documents";
import { db } from "~/server/db";
import { typesense } from "../client";
import type { VideoV1 } from "../schemas/videos";
import {
  type EnrichedVideo,
  type MapSearchResultsOptions,
  mapSearchResultsToVideos,
} from "./search-response-mapper";

type SortDirection = "asc" | "desc";
type SortableField = keyof Pick<
  VideoV1,
  | "created_at"
  | "updated_at"
  | "popularity_score"
  | "trending_score"
  | "engagement_rate"
  | "view_count"
  | "like_count"
  | "dislike_count"
  | "duration_seconds"
  | "views_last_24h"
  | "views_last_7d"
  | "likes_last_24h"
  | "likes_last_7d"
>;

type SearchableField = keyof Pick<
  VideoV1,
  | "title"
  | "description"
  | "creator_username"
  | "creator_display_name"
  | "tag_names"
  | "featured_creator_display_names"
  | "featured_creator_aliases"
>;

type FilterOperator = "=" | "!=" | ">" | "<" | ">=" | "<=";

interface TypesenseSearchParams {
  q: string;
  query_by?: string;
  filter_by?: string;
  sort_by?: string;
  per_page?: number;
  page?: number;
  vector_query?: string;
  prioritize_exact_match?: boolean;
  [key: string]: unknown;
}

export class VideoQueryBuilder {
  private query: string = "*";
  private queryByFields: SearchableField[] = ["title"];
  private filters: string[] = [];
  private sortFields: Array<{
    field: SortableField;
    direction: SortDirection;
  }> = [];
  private perPage: number = 20;
  private offsetNum: number = 0;
  private vectorQuery?: string;
  private exactMatch: boolean = false;
  private additionalParams: Record<string, unknown> = {};

  /**
   * Set the search query
   * Use "*" for wildcard (all documents)
   */
  search(query: string): this {
    this.query = query || "*";
    return this;
  }

  /**
   * Set fields to search in
   * @default ["title"]
   */
  searchFields(fields: SearchableField[]): this {
    this.queryByFields = fields;
    return this;
  }

  /**
   * Add multiple fields to search (chainable)
   */
  addSearchField(...fields: SearchableField[]): this {
    this.queryByFields.push(...fields);
    return this;
  }

  /**
   * Enable/disable exact match prioritization
   */
  prioritizeExactMatch(enable: boolean = true): this {
    this.exactMatch = enable;
    return this;
  }

  // ==================== FILTER METHODS ====================

  /**
   * Add a raw filter expression
   * Useful for complex filters not covered by helper methods
   */
  addFilter(filter: string): this {
    if (filter) {
      this.filters.push(filter);
    }
    return this;
  }

  /**
   * Add multiple raw filters
   */
  addFilters(...filters: string[]): this {
    this.filters.push(...filters.filter(Boolean));
    return this;
  }

  /**
   * Filter by status = "approved"
   * Most common filter for public video queries
   */
  whereApproved(): this {
    return this.addFilter("status:approved");
  }

  /**
   * Filter by any status
   */
  whereStatus(status?: string): this {
    if (!status) return this;
    return this.addFilter(`status:${status}`);
  }

  /**
   * Filter by status != value
   */
  whereStatusNot(status?: string): this {
    if (!status) return this;
    return this.addFilter(`status:!=${status}`);
  }

  /**
   * Filter by creator ID
   */
  whereCreatorId(creatorId?: string): this {
    if (!creatorId) return this;
    return this.addFilter(`creator_id:=${creatorId}`);
  }

  /**
   * Filter by creator username
   */
  whereCreatorUsername(username?: string): this {
    if (!username) return this;
    return this.addFilter(`creator_username:=${username}`);
  }

  /**
   * Filter by creator OR featured creators
   */
  whereCreatorOrFeatured(creatorId?: string): this {
    return this.addFilter(
      `(creator_id:=${creatorId} || featured_creator_ids:=${creatorId})`,
    );
  }

  /**
   * Filter by uploader ID
   */
  whereUploadedById(userId?: string): this {
    if (!userId) return this;
    return this.addFilter(`uploaded_by_id:=${userId}`);
  }

  /**
   * Filter by tag IDs (OR logic - any tag matches)
   */
  whereTags(tagIds: string[]): this {
    if (tagIds.length === 0) return this;
    const tagFilter = tagIds.map((id) => `tag_ids:=${id}`).join(" || ");
    return this.addFilter(`(${tagFilter})`);
  }

  /**
   * Filter by tag IDs (AND logic - all tags must match)
   */
  whereTagsAll(tagIds: string[]): this {
    if (tagIds.length === 0) return this;
    const tagFilters = tagIds.map((id) => `tag_ids:=${id}`).join(" && ");
    return this.addFilter(`(${tagFilters})`);
  }

  /**
   * Filter by category IDs (OR logic)
   */
  whereCategories(categoryIds: string[]): this {
    if (categoryIds.length === 0) return this;
    const categoryFilter = categoryIds
      .map((id) => `category_ids:=${id}`)
      .join(" || ");
    return this.addFilter(`(${categoryFilter})`);
  }

  /**
   * Filter by duration range (in seconds)
   */
  whereDuration(operator: FilterOperator, seconds: number): this {
    return this.addFilter(`duration_seconds:${operator}${seconds}`);
  }

  /**
   * Filter by duration between min and max (inclusive)
   */
  whereDurationBetween(minSeconds?: number, maxSeconds?: number): this {
    if (!minSeconds) return this;
    if (!maxSeconds) return this;
    return this.addFilter(
      `duration_seconds:>=${minSeconds} && duration_seconds:<=${maxSeconds}`,
    );
  }

  /**
   * Filter by view count
   */
  whereViews(operator: FilterOperator, count: number): this {
    return this.addFilter(`view_count:${operator}${count}`);
  }

  /**
   * Filter by minimum view count
   */
  whereMinViews(count: number): this {
    return this.whereViews(">=", count);
  }

  /**
   * Filter by like count
   */
  whereLikes(operator: FilterOperator, count: number): this {
    return this.addFilter(`like_count:${operator}${count}`);
  }

  /**
   * Filter videos with active reports
   */
  whereHasActiveReports(hasReports: boolean = true): this {
    return this.addFilter(`has_active_reports:${hasReports}`);
  }

  /**
   * Filter by transcoding status
   */
  whereIsTranscoded(isTranscoded: boolean = true): this {
    return this.addFilter(`is_transcoded:${isTranscoded}`);
  }

  /**
   * Filter by transcode status
   */
  whereTranscodeStatus(
    status: "queued" | "processing" | "complete" | "failed",
  ): this {
    return this.addFilter(`transcode_status:${status}`);
  }

  /**
   * Filter by popularity score
   */
  wherePopularityScore(operator: FilterOperator, score: number): this {
    return this.addFilter(`popularity_score:${operator}${score}`);
  }

  /**
   * Filter by trending score
   */
  whereTrendingScore(operator: FilterOperator, score: number): this {
    return this.addFilter(`trending_score:${operator}${score}`);
  }

  /**
   * Filter by engagement rate
   */
  whereEngagementRate(operator: FilterOperator, rate: number): this {
    return this.addFilter(`engagement_rate:${operator}${rate}`);
  }

  /**
   * Filter by created date (Unix timestamp)
   */
  whereCreatedAt(operator: FilterOperator, timestamp: number): this {
    return this.addFilter(`created_at:${operator}${timestamp}`);
  }

  /**
   * Filter videos created after a date
   */
  whereCreatedAfter(date: Date): this {
    return this.whereCreatedAt(">", Math.floor(date.getTime() / 1000));
  }

  /**
   * Filter videos created before a date
   */
  whereCreatedBefore(date: Date): this {
    return this.whereCreatedAt("<", Math.floor(date.getTime() / 1000));
  }

  /**
   * Filter videos created between two dates
   */
  whereCreatedBetween(startDate: Date, endDate: Date): this {
    const start = Math.floor(startDate.getTime() / 1000);
    const end = Math.floor(endDate.getTime() / 1000);
    return this.addFilter(`created_at:>=${start} && created_at:<=${end}`);
  }

  // ==================== SORT METHODS ====================

  /**
   * Add a sort field
   */
  sortBy(field: SortableField, direction: SortDirection = "desc"): this {
    this.sortFields.push({ field, direction });
    return this;
  }

  /**
   * Sort by multiple fields (chainable)
   */
  addSort(field: SortableField, direction: SortDirection = "desc"): this {
    return this.sortBy(field, direction);
  }

  /**
   * Sort by trending score (desc)
   */
  sortByTrending(): this {
    return this.sortBy("trending_score", "desc");
  }

  /**
   * Sort by popularity score (desc)
   */
  sortByPopularity(): this {
    return this.sortBy("popularity_score", "desc");
  }

  /**
   * Sort by most recent
   */
  sortByNewest(): this {
    return this.sortBy("created_at", "desc");
  }

  /**
   * Sort by oldest
   */
  sortByOldest(): this {
    return this.sortBy("created_at", "asc");
  }

  /**
   * Sort by most viewed
   */
  sortByViews(): this {
    return this.sortBy("view_count", "desc");
  }

  /**
   * Sort by most liked
   */
  sortByLikes(): this {
    return this.sortBy("like_count", "desc");
  }

  /**
   * Sort by engagement rate (desc)
   */
  sortByEngagement(): this {
    return this.sortBy("engagement_rate", "desc");
  }

  /**
   * Sort by text match relevance (for searches)
   * Add this before other sorts to prioritize relevance
   */
  sortByRelevance(): this {
    // Text match is a special sort field
    this.sortFields.unshift({
      field: "_text_match" as SortableField,
      direction: "desc",
    });
    return this;
  }

  // ==================== PAGINATION METHODS ====================

  /**
   * Set results per page (limit)
   */
  limit(count: number): this {
    this.perPage = count;
    return this;
  }

  /**
   * Set page number (1-indexed)
   */
  page(pageNumber: number): this {
    this.offsetNum = pageNumber * this.perPage;
    return this;
  }

  /**
   * Set offset-based pagination
   */
  offset(offsetValue: number | null): this {
    if (offsetValue == null) return this;

    this.offsetNum = offsetValue;
    return this;
  }

  // ==================== VECTOR SEARCH ====================

  /**
   * Add vector search query
   * @param embedding - The embedding vector (number array)
   * @param k - Number of nearest neighbors to find
   */
  vectorSearch(embedding: number[], k: number = 20): this {
    this.vectorQuery = `title_embedding:([${embedding.join(",")}], k:${k})`;
    return this;
  }

  /**
   * Add vector search with raw query string
   */
  vectorSearchRaw(query: string): this {
    this.vectorQuery = query;
    return this;
  }

  // ==================== ADVANCED ====================

  /**
   * Add custom parameter to the query
   */
  addParam(key: string, value: unknown): this {
    this.additionalParams[key] = value;
    return this;
  }

  /**
   * Clear all filters
   */
  clearFilters(): this {
    this.filters = [];
    return this;
  }

  /**
   * Clear all sorts
   */
  clearSorts(): this {
    this.sortFields = [];
    return this;
  }

  /**
   * Reset builder to default state
   */
  reset(): this {
    this.query = "*";
    this.queryByFields = ["title"];
    this.filters = [];
    this.sortFields = [];
    this.perPage = 20;
    this.offsetNum = 0;
    this.vectorQuery = undefined;
    this.exactMatch = false;
    this.additionalParams = {};
    return this;
  }

  /**
   * Clone the current builder
   */
  clone(): VideoQueryBuilder {
    const cloned = new VideoQueryBuilder();
    cloned.query = this.query;
    cloned.queryByFields = [...this.queryByFields];
    cloned.filters = [...this.filters];
    cloned.sortFields = [...this.sortFields];
    cloned.perPage = this.perPage;
    cloned.offsetNum = this.offsetNum;
    cloned.vectorQuery = this.vectorQuery;
    cloned.exactMatch = this.exactMatch;
    cloned.additionalParams = { ...this.additionalParams };
    return cloned;
  }

  /**
   * Build and return the final query object
   */
  build(): TypesenseSearchParams {
    const params: TypesenseSearchParams = {
      q: this.query,
      query_by: this.queryByFields.join(","),
      ...this.additionalParams,
    };

    // Add filters
    if (this.filters.length > 0) {
      params.filter_by = this.filters.join(" && ");
    }

    // Add sorting
    if (this.sortFields.length > 0) {
      params.sort_by = this.sortFields
        .map((s) => `${s.field}:${s.direction}`)
        .join(",");
    }

    // Add pagination
    if (this.perPage !== 20) {
      params.per_page = this.perPage;
    }
    if (this.offsetNum > 0) {
      params.offset = this.offsetNum;
    }

    // Add vector search
    if (this.vectorQuery) {
      params.vector_query = this.vectorQuery;
    }

    // Add exact match
    if (this.exactMatch) {
      params.prioritize_exact_match = true;
    }

    return params;
  }

  /**
   * Build and return as JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.build(), null, 2);
  }

  execute(): Promise<SearchResponse<VideoV1>> {
    return typesense
      .collections<VideoV1>("video_v1")
      .documents()
      .search(this.build());
  }

  async executeAndMap(
    options?: Omit<MapSearchResultsOptions, "db" | "searchResponse">,
  ): Promise<EnrichedVideo[]> {
    return mapSearchResultsToVideos({
      db,
      searchResponse: await this.execute(),
      ...options,
    });
  }
}

/**
 * Export types for external use
 */
export type {
  TypesenseSearchParams,
  SortDirection,
  SortableField,
  SearchableField,
  FilterOperator,
};
