/**
 * Represents a file in the system
 */
export interface FileEntity {
  /**
   * Name of the file
   */
  filename: string;
  
  /**
   * Path or prefix where the file is stored
   */
  path: string;
  
  /**
   * Content type of the file
   */
  contentType: string;
  
  /**
   * File contents (if being uploaded/downloaded)
   */
  content?: Buffer;
  
  /**
   * Size of the file
   */
  size?: number;
  
  /**
   * Metadata associated with the file
   */
  metadata?: Record<string, string>;
}

/**
 * Represents a presigned URL operation result
 */
export interface PresignedUrlResult {
  /**
   * The generated presigned URL
   */
  url: string;
  
  /**
   * Additional fields required for the presigned URL
   */
  fields?: Record<string, string>;
  
  /**
   * The key (path) of the file in the bucket
   */
  key: string;
  
  /**
   * The bucket where the file is stored
   */
  bucket: string;
  
  /**
   * Expiration time of the URL in seconds
   */
  expiresAt: number;
}

/**
 * Represents file metadata
 */
export interface FileMetadata {
  /**
   * Key of the file
   */
  key: string;
  
  /**
   * Content type of the file
   */
  contentType: string;
  
  /**
   * Size of the file
   */
  size: number;
  
  /**
   * Last modified date of the file
   */
  lastModified: Date;
  
  /**
   * Bucket where the file is stored
   */
  bucket: string;
  
  /**
   * URL of the file
   */
  url?: string;
  
  /**
   * Metadata associated with the file
   */
  metadata?: Record<string, string>;
} 