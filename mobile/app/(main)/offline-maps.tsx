import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TileCacheManager, OfflineRegion } from '../../src/services/map/TileCacheManager';
import { OfflineRegionCard } from '../../src/components/OfflineRegionCard';
import { LoraSimulator } from '../../src/services/lora/LoraSimulator';
import { useNetworkStore } from '../../src/store/networkStore';
import { Colors, Spacing } from '../../src/utils/responsive';
import { useLanguageStore } from '../../src/i18n';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

export interface IndiaSmallRegionPreset {
  id: string;
  name: string;
  district: string;
  state: string;
  zone: string;
  centerLat: number;
  centerLon: number;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  estMB: string;
}

export const INDIA_SMALL_REGIONS: IndiaSmallRegionPreset[] = [
  // --- TAMIL NADU MICRO-REGIONS ---
  {
    id: 'tn-cbe-urb',
    name: 'Coimbatore Urban (Kovai)',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    zone: 'South India',
    centerLat: 11.0168,
    centerLon: 76.9558,
    minLat: 10.9700,
    maxLat: 11.0600,
    minLon: 76.9000,
    maxLon: 77.0100,
    estMB: '8.5 MB'
  },
  {
    id: 'tn-sat-val',
    name: 'Sathyamangalam (Sathy) Reserve',
    district: 'Erode',
    state: 'Tamil Nadu',
    zone: 'South India',
    centerLat: 11.5034,
    centerLon: 77.2444,
    minLat: 11.4500,
    maxLat: 11.5500,
    minLon: 77.1800,
    maxLon: 77.3000,
    estMB: '7.8 MB'
  },
  {
    id: 'tn-che-nrt',
    name: 'Chennai Port & North',
    district: 'Chennai',
    state: 'Tamil Nadu',
    zone: 'South India',
    centerLat: 13.0827,
    centerLon: 80.2707,
    minLat: 13.0500,
    maxLat: 13.1500,
    minLon: 80.2200,
    maxLon: 80.3200,
    estMB: '11.2 MB'
  },
  {
    id: 'tn-che-sth',
    name: 'Chennai South & Guindy',
    district: 'Chennai',
    state: 'Tamil Nadu',
    zone: 'South India',
    centerLat: 12.9800,
    centerLon: 80.2200,
    minLat: 12.9200,
    maxLat: 13.0200,
    minLon: 80.1700,
    maxLon: 80.2700,
    estMB: '10.8 MB'
  },
  {
    id: 'tn-mdu-hrt',
    name: 'Madurai Heritage Zone',
    district: 'Madurai',
    state: 'Tamil Nadu',
    zone: 'South India',
    centerLat: 9.9252,
    centerLon: 78.1198,
    minLat: 9.8800,
    maxLat: 9.9700,
    minLon: 78.0700,
    maxLon: 78.1700,
    estMB: '8.1 MB'
  },
  {
    id: 'tn-try-ctl',
    name: 'Trichy (Tiruchirappalli) Town',
    district: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    zone: 'South India',
    centerLat: 10.7905,
    centerLon: 78.7047,
    minLat: 10.7400,
    maxLat: 10.8400,
    minLon: 78.6500,
    maxLon: 78.7500,
    estMB: '7.6 MB'
  },
  {
    id: 'tn-slm-ind',
    name: 'Salem Steel & Industrial Corridor',
    district: 'Salem',
    state: 'Tamil Nadu',
    zone: 'South India',
    centerLat: 11.6643,
    centerLon: 78.1460,
    minLat: 11.6100,
    maxLat: 11.7100,
    minLon: 78.1000,
    maxLon: 78.2000,
    estMB: '7.9 MB'
  },
  {
    id: 'tn-erd-bvh',
    name: 'Erode & Bhavani River Belt',
    district: 'Erode',
    state: 'Tamil Nadu',
    zone: 'South India',
    centerLat: 11.3410,
    centerLon: 77.7172,
    minLat: 11.2900,
    maxLat: 11.3900,
    minLon: 77.6600,
    maxLon: 77.7600,
    estMB: '7.2 MB'
  },
  {
    id: 'tn-tpr-ind',
    name: 'Tiruppur Textile Belt',
    district: 'Tiruppur',
    state: 'Tamil Nadu',
    zone: 'South India',
    centerLat: 11.1085,
    centerLon: 77.3411,
    minLat: 11.0600,
    maxLat: 11.1600,
    minLon: 77.2900,
    maxLon: 77.3900,
    estMB: '7.4 MB'
  },
  {
    id: 'tn-tvl-sub',
    name: 'Tirunelveli Town Region',
    district: 'Tirunelveli',
    state: 'Tamil Nadu',
    zone: 'South India',
    centerLat: 8.7139,
    centerLon: 77.7567,
    minLat: 8.6600,
    maxLat: 8.7600,
    minLon: 77.7000,
    maxLon: 77.8000,
    estMB: '6.9 MB'
  },
  {
    id: 'tn-vlr-frt',
    name: 'Vellore Fort Area',
    district: 'Vellore',
    state: 'Tamil Nadu',
    zone: 'South India',
    centerLat: 12.9165,
    centerLon: 79.1325,
    minLat: 12.8700,
    maxLat: 12.9600,
    minLon: 79.0800,
    maxLon: 79.1800,
    estMB: '7.1 MB'
  },
  {
    id: 'tn-kk-cst',
    name: 'Kanyakumari Southern Tip',
    district: 'Kanyakumari',
    state: 'Tamil Nadu',
    zone: 'South India',
    centerLat: 8.0883,
    centerLon: 77.5385,
    minLat: 8.0400,
    maxLat: 8.1400,
    minLon: 77.4800,
    maxLon: 77.5800,
    estMB: '6.5 MB'
  },
  {
    id: 'tn-oot-nlg',
    name: 'Ooty & Nilgiris Hill Station',
    district: 'Nilgiris',
    state: 'Tamil Nadu',
    zone: 'South India',
    centerLat: 11.4102,
    centerLon: 76.6950,
    minLat: 11.3600,
    maxLat: 11.4600,
    minLon: 76.6400,
    maxLon: 76.7400,
    estMB: '7.8 MB'
  },

  // --- KARNATAKA MICRO-REGIONS ---
  {
    id: 'ka-blr-ctl',
    name: 'Bengaluru Central / MG Road',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    zone: 'South India',
    centerLat: 12.9716,
    centerLon: 77.5946,
    minLat: 12.9200,
    maxLat: 13.0100,
    minLon: 77.5400,
    maxLon: 77.6400,
    estMB: '11.8 MB'
  },
  {
    id: 'ka-blr-e-city',
    name: 'Bengaluru Whitefield & E-City',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    zone: 'South India',
    centerLat: 12.8500,
    centerLon: 77.6600,
    minLat: 12.8000,
    maxLat: 12.9200,
    minLon: 77.6000,
    maxLon: 77.7200,
    estMB: '11.5 MB'
  },
  {
    id: 'ka-mys-hrt',
    name: 'Mysuru Palace & City',
    district: 'Mysuru',
    state: 'Karnataka',
    zone: 'South India',
    centerLat: 12.2958,
    centerLon: 76.6394,
    minLat: 12.2500,
    maxLat: 12.3400,
    minLon: 76.5900,
    maxLon: 76.6900,
    estMB: '7.7 MB'
  },
  {
    id: 'ka-mgl-cst',
    name: 'Mangaluru Port & Coast',
    district: 'Dakshina Kannada',
    state: 'Karnataka',
    zone: 'South India',
    centerLat: 12.9141,
    centerLon: 74.8560,
    minLat: 12.8600,
    maxLat: 12.9600,
    minLon: 74.8000,
    maxLon: 74.9000,
    estMB: '7.3 MB'
  },
  {
    id: 'ka-hub-dwd',
    name: 'Hubballi-Dharwad Region',
    district: 'Dharwad',
    state: 'Karnataka',
    zone: 'South India',
    centerLat: 15.3647,
    centerLon: 75.1240,
    minLat: 15.3100,
    maxLat: 15.4100,
    minLon: 75.0700,
    maxLon: 75.1700,
    estMB: '7.4 MB'
  },

  // --- KERALA MICRO-REGIONS ---
  {
    id: 'kl-cok-mtr',
    name: 'Kochi & Ernakulam Marine',
    district: 'Ernakulam',
    state: 'Kerala',
    zone: 'South India',
    centerLat: 9.9312,
    centerLon: 76.2673,
    minLat: 9.8800,
    maxLat: 9.9800,
    minLon: 76.2100,
    maxLon: 76.3100,
    estMB: '9.2 MB'
  },
  {
    id: 'kl-trv-cap',
    name: 'Thiruvananthapuram Capital',
    district: 'Thiruvananthapuram',
    state: 'Kerala',
    zone: 'South India',
    centerLat: 8.5241,
    centerLon: 76.9366,
    minLat: 8.4700,
    maxLat: 8.5700,
    minLon: 76.8800,
    maxLon: 76.9800,
    estMB: '8.6 MB'
  },
  {
    id: 'kl-kzh-cst',
    name: 'Kozhikode Beach & Town',
    district: 'Kozhikode',
    state: 'Kerala',
    zone: 'South India',
    centerLat: 11.2588,
    centerLon: 75.7804,
    minLat: 11.2100,
    maxLat: 11.3100,
    minLon: 75.7300,
    maxLon: 75.8300,
    estMB: '7.5 MB'
  },
  {
    id: 'kl-wyn-hls',
    name: 'Wayanad Forest Region',
    district: 'Wayanad',
    state: 'Kerala',
    zone: 'South India',
    centerLat: 11.6854,
    centerLon: 76.1320,
    minLat: 11.6300,
    maxLat: 11.7300,
    minLon: 76.0800,
    maxLon: 76.1800,
    estMB: '6.8 MB'
  },

  // --- TELANGANA & ANDHRA PRADESH MICRO-REGIONS ---
  {
    id: 'ts-hyd-htc',
    name: 'Hyderabad Cyberabad & Gachibowli',
    district: 'Hyderabad',
    state: 'Telangana',
    zone: 'South India',
    centerLat: 17.4401,
    centerLon: 78.3489,
    minLat: 17.3900,
    maxLat: 17.4900,
    minLon: 78.3000,
    maxLon: 78.4000,
    estMB: '11.4 MB'
  },
  {
    id: 'ts-hyd-old',
    name: 'Hyderabad Charminar / Old City',
    district: 'Hyderabad',
    state: 'Telangana',
    zone: 'South India',
    centerLat: 17.3616,
    centerLon: 78.4747,
    minLat: 17.3100,
    maxLat: 17.4100,
    minLon: 78.4200,
    maxLon: 78.5200,
    estMB: '10.9 MB'
  },
  {
    id: 'ap-viz-cst',
    name: 'Visakhapatnam Beach & Port',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    zone: 'South India',
    centerLat: 17.6868,
    centerLon: 83.2185,
    minLat: 17.6300,
    maxLat: 17.7300,
    minLon: 83.1600,
    maxLon: 83.2600,
    estMB: '8.8 MB'
  },
  {
    id: 'ap-vjw-rvr',
    name: 'Vijayawada Krishna Region',
    district: 'NTR District',
    state: 'Andhra Pradesh',
    zone: 'South India',
    centerLat: 16.5062,
    centerLon: 80.6480,
    minLat: 16.4500,
    maxLat: 16.5500,
    minLon: 80.5900,
    maxLon: 80.6900,
    estMB: '7.9 MB'
  },
  {
    id: 'ap-tpt-tmp',
    name: 'Tirupati Temple Foothills',
    district: 'Tirupati',
    state: 'Andhra Pradesh',
    zone: 'South India',
    centerLat: 13.6288,
    centerLon: 79.4192,
    minLat: 13.5800,
    maxLat: 13.6800,
    minLon: 79.3600,
    maxLon: 79.4600,
    estMB: '7.1 MB'
  },

  // --- MAHARASHTRA & GOA MICRO-REGIONS ---
  {
    id: 'mh-mum-sth',
    name: 'South Mumbai & Colaba',
    district: 'Mumbai City',
    state: 'Maharashtra',
    zone: 'West India',
    centerLat: 18.9220,
    centerLon: 72.8347,
    minLat: 18.8800,
    maxLat: 18.9800,
    minLon: 72.7800,
    maxLon: 72.8800,
    estMB: '13.2 MB'
  },
  {
    id: 'mh-mum-sub',
    name: 'Mumbai Suburbs (Bandra / Andheri)',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    zone: 'West India',
    centerLat: 19.1197,
    centerLon: 72.8464,
    minLat: 19.0600,
    maxLat: 19.1700,
    minLon: 72.7900,
    maxLon: 72.9000,
    estMB: '14.0 MB'
  },
  {
    id: 'mh-pun-hin',
    name: 'Pune Hinjawadi Tech Park',
    district: 'Pune',
    state: 'Maharashtra',
    zone: 'West India',
    centerLat: 18.5912,
    centerLon: 73.7389,
    minLat: 18.5400,
    maxLat: 18.6400,
    minLon: 73.6800,
    maxLon: 73.7900,
    estMB: '10.8 MB'
  },
  {
    id: 'mh-nag-ctl',
    name: 'Nagpur Central Region',
    district: 'Nagpur',
    state: 'Maharashtra',
    zone: 'West India',
    centerLat: 21.1458,
    centerLon: 79.0882,
    minLat: 21.0900,
    maxLat: 21.1900,
    minLon: 79.0300,
    maxLon: 79.1300,
    estMB: '7.8 MB'
  },
  {
    id: 'ga-pan-cst',
    name: 'Panaji & North Goa Beaches',
    district: 'North Goa',
    state: 'Goa',
    zone: 'West India',
    centerLat: 15.4989,
    centerLon: 73.8278,
    minLat: 15.4400,
    maxLat: 15.5500,
    minLon: 73.7700,
    maxLon: 73.8800,
    estMB: '8.2 MB'
  },

  // --- GUJARAT & RAJASTHAN MICRO-REGIONS ---
  {
    id: 'gj-amd-sab',
    name: 'Ahmedabad Sabarmati Corridor',
    district: 'Ahmedabad',
    state: 'Gujarat',
    zone: 'West India',
    centerLat: 23.0225,
    centerLon: 72.5714,
    minLat: 22.9700,
    maxLat: 23.0700,
    minLon: 72.5200,
    maxLon: 72.6200,
    estMB: '10.5 MB'
  },
  {
    id: 'gj-sur-txt',
    name: 'Surat Textile City',
    district: 'Surat',
    state: 'Gujarat',
    zone: 'West India',
    centerLat: 21.1702,
    centerLon: 72.8311,
    minLat: 21.1200,
    maxLat: 21.2200,
    minLon: 72.7800,
    maxLon: 72.8800,
    estMB: '9.4 MB'
  },
  {
    id: 'rj-jai-pnk',
    name: 'Jaipur Pink City Heritage',
    district: 'Jaipur',
    state: 'Rajasthan',
    zone: 'West India',
    centerLat: 26.9124,
    centerLon: 75.7873,
    minLat: 26.8600,
    maxLat: 26.9600,
    minLon: 75.7300,
    maxLon: 75.8400,
    estMB: '9.1 MB'
  },
  {
    id: 'rj-uda-lke',
    name: 'Udaipur City of Lakes',
    district: 'Udaipur',
    state: 'Rajasthan',
    zone: 'West India',
    centerLat: 24.5854,
    centerLon: 73.7125,
    minLat: 24.5300,
    maxLat: 24.6300,
    minLon: 73.6600,
    maxLon: 73.7600,
    estMB: '7.4 MB'
  },

  // --- DELHI NCR & UTTAR PRADESH MICRO-REGIONS ---
  {
    id: 'dl-cp-ctl',
    name: 'New Delhi Connaught Place',
    district: 'New Delhi',
    state: 'Delhi NCR',
    zone: 'North India',
    centerLat: 28.6304,
    centerLon: 77.2177,
    minLat: 28.5800,
    maxLat: 28.6800,
    minLon: 77.1600,
    maxLon: 77.2700,
    estMB: '13.5 MB'
  },
  {
    id: 'hr-gur-cyb',
    name: 'Gurugram (Gurgaon) Cyber City',
    district: 'Gurugram',
    state: 'Delhi NCR',
    zone: 'North India',
    centerLat: 28.4595,
    centerLon: 77.0266,
    minLat: 28.4000,
    maxLat: 28.5100,
    minLon: 76.9700,
    maxLon: 77.0800,
    estMB: '12.1 MB'
  },
  {
    id: 'up-noid-sec',
    name: 'Noida Sector 62 Corridor',
    district: 'Gautam Buddha Nagar',
    state: 'Delhi NCR',
    zone: 'North India',
    centerLat: 28.6280,
    centerLon: 77.3649,
    minLat: 28.5700,
    maxLat: 28.6700,
    minLon: 77.3100,
    maxLon: 77.4200,
    estMB: '11.6 MB'
  },
  {
    id: 'up-lko-gmt',
    name: 'Lucknow Gomti Nagar',
    district: 'Lucknow',
    state: 'Uttar Pradesh',
    zone: 'North India',
    centerLat: 26.8467,
    centerLon: 80.9462,
    minLat: 26.7900,
    maxLat: 26.8900,
    minLon: 80.8900,
    maxLon: 81.0000,
    estMB: '8.9 MB'
  },
  {
    id: 'up-vns-ght',
    name: 'Varanasi Ghats & Heritage',
    district: 'Varanasi',
    state: 'Uttar Pradesh',
    zone: 'North India',
    centerLat: 25.3176,
    centerLon: 82.9739,
    minLat: 25.2600,
    maxLat: 25.3600,
    minLon: 82.9200,
    maxLon: 83.0200,
    estMB: '8.3 MB'
  },
  {
    id: 'up-agr-taj',
    name: 'Agra Taj Mahal Belt',
    district: 'Agra',
    state: 'Uttar Pradesh',
    zone: 'North India',
    centerLat: 27.1767,
    centerLon: 78.0081,
    minLat: 27.1200,
    maxLat: 27.2200,
    minLon: 77.9500,
    maxLon: 78.0600,
    estMB: '7.9 MB'
  },

  // --- EAST & NORTH-EAST MICRO-REGIONS ---
  {
    id: 'wb-kol-slt',
    name: 'Kolkata Salt Lake & Park St',
    district: 'Kolkata',
    state: 'West Bengal',
    zone: 'East & NE India',
    centerLat: 22.5726,
    centerLon: 88.3639,
    minLat: 22.5200,
    maxLat: 22.6200,
    minLon: 88.3100,
    maxLon: 88.4200,
    estMB: '12.4 MB'
  },
  {
    id: 'or-bbs-smr',
    name: 'Bhubaneswar Temple & Tech',
    district: 'Khordha',
    state: 'Odisha',
    zone: 'East & NE India',
    centerLat: 20.2961,
    centerLon: 85.8245,
    minLat: 20.2400,
    maxLat: 20.3400,
    minLon: 85.7700,
    maxLon: 85.8700,
    estMB: '7.9 MB'
  },
  {
    id: 'as-ghy-vly',
    name: 'Guwahati Brahmaputra Bank',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    zone: 'East & NE India',
    centerLat: 26.1445,
    centerLon: 91.7362,
    minLat: 26.0900,
    maxLat: 26.1900,
    minLon: 91.6800,
    maxLon: 91.7900,
    estMB: '7.4 MB'
  },
  {
    id: 'ml-shl-hls',
    name: 'Shillong Hill Capital',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    zone: 'East & NE India',
    centerLat: 25.5788,
    centerLon: 91.8933,
    minLat: 25.5200,
    maxLat: 25.6200,
    minLon: 91.8400,
    maxLon: 91.9400,
    estMB: '6.7 MB'
  }
];

export default function OfflineMapsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const isOnline = useNetworkStore((s) => s.isOnline);

  const [downloadedRegions, setDownloadedRegions] = useState<OfflineRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingName, setDownloadingName] = useState<string>('');
  const [progressPct, setProgressPct] = useState(0);

  // Custom region entry state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customLat, setCustomLat] = useState('11.0168');
  const [customLon, setCustomLon] = useState('76.9558');

  const tileManager = TileCacheManager.getInstance();

  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    const list = await tileManager.getRegions();
    setDownloadedRegions(list);
    if (list.length > 0 && selectedRegionId === null) {
      setSelectedRegionId(list[0].id);
    }
  };

  const handleDownloadPreset = async (preset: IndiaSmallRegionPreset) => {
    if (!isOnline) {
      Alert.alert('Internet Required', 'Please connect to Internet to download offline map regions.');
      return;
    }

    setIsDownloading(true);
    setDownloadingName(preset.name);
    setProgressPct(10);

    // Update simulator to center around this region
    LoraSimulator.getInstance().setCustomCoordinates(preset.centerLat, preset.centerLon);

    try {
      await tileManager.downloadRegion(
        `${preset.name} (${preset.district})`,
        preset.minLat,
        preset.maxLat,
        preset.minLon,
        preset.maxLon,
        (pct) => setProgressPct(pct)
      );
      await loadRegions();
      Alert.alert(
        '✓ Small Region Downloaded',
        `"${preset.name}" tile package (${preset.estMB}) is saved! Disconnect internet to test offline map tile rendering.`
      );
    } catch (err: any) {
      Alert.alert('Download Failed', err.message);
    } finally {
      setIsDownloading(false);
      setDownloadingName('');
      setProgressPct(0);
    }
  };

  const handleCustomDownload = async () => {
    if (!customName.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for your custom region.');
      return;
    }
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);

    if (isNaN(lat) || isNaN(lon) || lat < 6 || lat > 38 || lon < 68 || lon > 98) {
      Alert.alert('Invalid Coordinates', 'Please enter valid India Latitude (6 to 38) and Longitude (68 to 98).');
      return;
    }

    if (!isOnline) {
      Alert.alert('Internet Required', 'Please connect to Internet to download offline map regions.');
      return;
    }

    setIsDownloading(true);
    setDownloadingName(customName);
    setProgressPct(10);

    // Small ~10km bounding box (0.05 degrees lat/lon offset)
    const minLat = parseFloat((lat - 0.05).toFixed(4));
    const maxLat = parseFloat((lat + 0.05).toFixed(4));
    const minLon = parseFloat((lon - 0.05).toFixed(4));
    const maxLon = parseFloat((lon + 0.05).toFixed(4));

    LoraSimulator.getInstance().setCustomCoordinates(lat, lon);

    try {
      await tileManager.downloadRegion(
        `${customName.trim()} (Custom)`,
        minLat,
        maxLat,
        minLon,
        maxLon,
        (pct) => setProgressPct(pct)
      );
      await loadRegions();
      setShowCustomForm(false);
      setCustomName('');
      Alert.alert('✓ Custom Region Saved', `"${customName}" map tiles downloaded successfully!`);
    } catch (err: any) {
      Alert.alert('Download Failed', err.message);
    } finally {
      setIsDownloading(false);
      setDownloadingName('');
      setProgressPct(0);
    }
  };

  const handleDelete = async (id: number) => {
    await tileManager.deleteRegion(id);
    if (selectedRegionId === id) setSelectedRegionId(null);
    await loadRegions();
  };

  const filters = [
    'All',
    'Tamil Nadu',
    'Karnataka',
    'Kerala',
    'Telangana & AP',
    'Maharashtra',
    'Delhi NCR',
    'Gujarat & Raj',
    'East & NE'
  ];

  const filteredRegions = INDIA_SMALL_REGIONS.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q === '' ||
      r.name.toLowerCase().includes(q) ||
      r.district.toLowerCase().includes(q) ||
      r.state.toLowerCase().includes(q);

    let matchesFilter = true;
    if (selectedFilter === 'Tamil Nadu') matchesFilter = r.state === 'Tamil Nadu';
    else if (selectedFilter === 'Karnataka') matchesFilter = r.state === 'Karnataka';
    else if (selectedFilter === 'Kerala') matchesFilter = r.state === 'Kerala';
    else if (selectedFilter === 'Telangana & AP') matchesFilter = r.state === 'Telangana' || r.state === 'Andhra Pradesh';
    else if (selectedFilter === 'Maharashtra') matchesFilter = r.state === 'Maharashtra' || r.state === 'Goa';
    else if (selectedFilter === 'Delhi NCR') matchesFilter = r.state === 'Delhi NCR' || r.state === 'Uttar Pradesh';
    else if (selectedFilter === 'Gujarat & Raj') matchesFilter = r.state === 'Gujarat' || r.state === 'Rajasthan';
    else if (selectedFilter === 'East & NE') matchesFilter = r.zone === 'East & NE India';

    return matchesSearch && matchesFilter;
  });

  return (
    <ErrorBoundary fallbackTitle="Offline Maps Error">
      <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.responsiveWrapper}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🇮🇳 {t('india_offline_map_directory')}</Text>
          <Text style={styles.headerSubtitle}>
            {isOnline
              ? t('online_download_subtext')
              : t('offline_cached_subtext')}
          </Text>
        </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Downloading Active Banner */}
        {isDownloading && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <ActivityIndicator size="small" color="#18181B" />
              <Text style={styles.progressTitle}>{t('downloading')} "{downloadingName}"...</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.progressPctText}>{progressPct}% completed</Text>
          </View>
        )}

        {/* Custom Lat/Lon Region Expander */}
        <View style={styles.customContainer}>
          <TouchableOpacity
            style={styles.customToggleBtn}
            onPress={() => setShowCustomForm(!showCustomForm)}
          >
            <Text style={styles.customToggleText}>
              {showCustomForm ? `▲ ${t('hide_custom_region')}` : `➕ ${t('create_custom_region')}`}
            </Text>
          </TouchableOpacity>

          {showCustomForm && (
            <View style={styles.customFormBox}>
              <Text style={styles.inputLabel}>{t('custom_region_name')}:</Text>
              <TextInput
                style={styles.customInput}
                placeholder="e.g. Coimbatore North, MG Road, My Substation"
                placeholderTextColor={Colors.textMuted}
                value={customName}
                onChangeText={setCustomName}
              />
              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>{t('latitude')} (°N):</Text>
                  <TextInput
                    style={styles.customInput}
                    keyboardType="numeric"
                    placeholder="11.0168"
                    placeholderTextColor={Colors.textMuted}
                    value={customLat}
                    onChangeText={setCustomLat}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>{t('longitude')} (°E):</Text>
                  <TextInput
                    style={styles.customInput}
                    keyboardType="numeric"
                    placeholder="76.9558"
                    placeholderTextColor={Colors.textMuted}
                    value={customLon}
                    onChangeText={setCustomLon}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={styles.downloadCustomBtn}
                onPress={handleCustomDownload}
                disabled={isDownloading}
              >
                <Text style={styles.downloadCustomBtnText}>
                  {isDownloading ? t('downloading') : `📥 ${t('download_custom_small_region')}`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Catalog Section */}
        <View style={styles.catalogContainer}>
          <Text style={styles.cardTitle}>🔍 {t('available_india_regions')} ({filteredRegions.length})</Text>

          {/* Search Box */}
          <TextInput
            style={styles.searchInput}
            placeholder={t('search_city_region')}
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* Region Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
            {filters.map((f) => {
              const isSelected = selectedFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(f)}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>{f}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Micro Regions Cards Grid */}
          <View style={styles.microGrid}>
            {filteredRegions.map((preset) => (
              <View key={preset.id} style={styles.microCard}>
                <View style={styles.microHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.microTitle}>📍 {preset.name}</Text>
                    <Text style={styles.microSub}>
                      {preset.district} District • {preset.state} ({preset.zone})
                    </Text>
                    <Text style={styles.microCoords}>
                      Center: ({preset.centerLat.toFixed(4)}°, {preset.centerLon.toFixed(4)}°) • ~{preset.estMB}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.microDownloadBtn}
                    onPress={() => handleDownloadPreset(preset)}
                    disabled={isDownloading}
                  >
                    <Text style={styles.microDownloadBtnText}>
                      {isDownloading && downloadingName === preset.name ? '...' : `📥 ${t('download')}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Saved Downloaded Maps List */}
        <View style={styles.savedSection}>
          <Text style={styles.savedTitle}>✓ {t('downloaded_offline_maps')} ({downloadedRegions.length})</Text>

          {downloadedRegions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('no_downloaded_maps')}</Text>
              <Text style={styles.emptySubText}>
                {t('online_download_subtext')}
              </Text>
            </View>
          ) : (
            downloadedRegions.map((item) => (
              <OfflineRegionCard
                key={item.id}
                region={item}
                onDelete={handleDelete}
                onSelect={(reg) => {
                  setSelectedRegionId(reg.id);
                  const midLat = (reg.minLatitude + reg.maxLatitude) / 2;
                  const midLon = (reg.minLongitude + reg.maxLongitude) / 2;
                  LoraSimulator.getInstance().setCustomCoordinates(midLat, midLon);
                  router.push('/map');
                }}
                isActive={selectedRegionId === item.id}
              />
            ))
          )}
        </View>
      </ScrollView>
      </View>
    </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  responsiveWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center'
  },
  header: {
    padding: Spacing.md + 2,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderColor: Colors.cardBorder
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'OpenSans_400Regular'
  },
  scrollContainer: {
    padding: Spacing.md
  },
  progressCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 4,
    marginBottom: Spacing.xs + 4
  },
  progressTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#3F3F46',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#22C55E'
  },
  progressPctText: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
    fontFamily: 'OpenSans_600SemiBold'
  },
  customContainer: {
    marginBottom: Spacing.md
  },
  customToggleBtn: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.md,
    alignItems: 'center'
  },
  customToggleText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  customFormBox: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.md,
    marginTop: Spacing.xs + 2
  },
  inputLabel: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'OpenSans_600SemiBold'
  },
  customInput: {
    backgroundColor: '#F4F5F7',
    color: Colors.textPrimary,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 4,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.xs + 4,
    fontFamily: 'OpenSans_400Regular'
  },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing.sm
  },
  halfInput: {
    flex: 1
  },
  downloadCustomBtn: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    marginTop: Spacing.xs
  },
  downloadCustomBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    fontFamily: 'OpenSans_700Bold'
  },
  catalogContainer: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.md,
    marginBottom: Spacing.md
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: Spacing.xs + 4,
    fontFamily: 'OpenSans_700Bold'
  },
  searchInput: {
    backgroundColor: '#F4F5F7',
    color: Colors.textPrimary,
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.sm,
    fontFamily: 'OpenSans_400Regular'
  },
  filterChipRow: {
    gap: Spacing.xs,
    marginBottom: Spacing.md
  },
  filterChip: {
    backgroundColor: '#F4F5F7',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder
  },
  filterChipActive: {
    backgroundColor: '#18181B',
    borderColor: '#18181B'
  },
  filterChipText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'OpenSans_600SemiBold'
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  microGrid: {
    gap: Spacing.sm
  },
  microCard: {
    backgroundColor: '#F4F5F7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.md
  },
  microHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  microTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  microSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'OpenSans_400Regular'
  },
  microCoords: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'OpenSans_400Regular'
  },
  microDownloadBtn: {
    backgroundColor: '#18181B',
    paddingVertical: Spacing.xs + 4,
    paddingHorizontal: Spacing.sm + 4,
    borderRadius: 12,
    marginLeft: Spacing.xs
  },
  microDownloadBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
    fontFamily: 'OpenSans_700Bold'
  },
  savedSection: {
    marginTop: Spacing.xs
  },
  savedTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
    fontFamily: 'OpenSans_700Bold'
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.lg,
    alignItems: 'center'
  },
  emptyText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  emptySubText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'OpenSans_400Regular'
  }
});
