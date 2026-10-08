import { addLocalOfflineRegion, getLocalOfflineRegions, deleteLocalOfflineRegion } from '../../database/dbQueries';

export interface OfflineRegion {
  id: number;
  name: string;
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
  sizeBytes: number;
  tileCount: number;
  status: 'downloading' | 'downloaded' | 'failed';
  createdAt: string;
}

export class TileCacheManager {
  private static instance: TileCacheManager;

  private constructor() {}

  public static getInstance(): TileCacheManager {
    if (!TileCacheManager.instance) {
      TileCacheManager.instance = new TileCacheManager();
    }
    return TileCacheManager.instance;
  }

  public calculateEstimatedSize(minLat: number, maxLat: number, minLon: number, maxLon: number, maxZoom: number = 14): { estSizeMB: number; estTileCount: number } {
    const latSpan = Math.abs(maxLat - minLat);
    const lonSpan = Math.abs(maxLon - minLon);
    // Approximation formula for tile count across zoom levels 10..14
    const estTileCount = Math.round((latSpan * 111) * (lonSpan * 111) * 35);
    const estSizeBytes = estTileCount * 15360; // ~15KB per vector/raster tile
    const estSizeMB = parseFloat((estSizeBytes / (1024 * 1024)).toFixed(1));
    return { estSizeMB, estTileCount };
  }

  public async downloadRegion(
    name: string,
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number,
    onProgress?: (progressPct: number) => void
  ): Promise<number> {
    console.log(`[TileCacheManager] Downloading offline map region "${name}"...`);

    const { estSizeMB, estTileCount } = this.calculateEstimatedSize(minLat, maxLat, minLon, maxLon);

    // Simulate tile batch downloading
    for (let p = 10; p <= 100; p += 20) {
      await new Promise((res) => setTimeout(res, 200));
      if (onProgress) onProgress(p);
    }

    const regionId = await addLocalOfflineRegion(
      name,
      minLat,
      maxLat,
      minLon,
      maxLon,
      Math.round(estSizeMB * 1024 * 1024),
      estTileCount
    );

    console.log(`[TileCacheManager] Region "${name}" downloaded successfully (ID: ${regionId})`);
    return regionId;
  }

  public async getRegions(): Promise<OfflineRegion[]> {
    const rows = await getLocalOfflineRegions();
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      minLatitude: r.min_latitude,
      maxLatitude: r.max_latitude,
      minLongitude: r.min_longitude,
      maxLongitude: r.max_longitude,
      sizeBytes: r.size_bytes,
      tileCount: r.tile_count,
      status: r.status,
      createdAt: r.created_at
    }));
  }

  public async deleteRegion(id: number): Promise<void> {
    await deleteLocalOfflineRegion(id);
    console.log(`[TileCacheManager] Region ${id} deleted`);
  }
}
