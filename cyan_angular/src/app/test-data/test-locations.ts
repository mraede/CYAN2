import { Location } from '../models/location';

export const LOCATIONS: Location[] = [
  Object.assign(new Location(),
    {
      id: 100001,
      type: 2,
      name: 'Sand Creek Park',
      latitude: 34.03472222,
      longitude: -83.38138889,
      latitude_deg: 34,
      latitude_min: 2,
      latitude_sec: 5,
      latitude_dir: 'N',
      longitude_deg: 83,
      longitude_min: 22,
      longitude_sec: 53,
      longitude_dir: 'W',
      cellConcentration: 120226,
      maxCellConcentration: 389045,
      concentrationChange: -27684,
      dataDate: '10/13/18',
      changeDate: '10/01/18',
      source: 'OLCI',
      sourceFrequency: 'Daily',
      validCellCount: 10,
      notes: [],
      marked: false
    }),
  Object.assign(new Location(),
    {
      id: 100002,
      type: 1,
      name: 'Lake Okeechobee',
      latitude: 27.03222222,
      longitude: -80.77722222,
      latitude_deg: 27,
      latitude_min: 1,
      latitude_sec: 56,
      latitude_dir: 'N',
      longitude_deg: 80,
      longitude_min: 46,
      longitude_sec: 38,
      longitude_dir: 'W',
      cellConcentration: 107151,
      maxCellConcentration: 144543,
      concentrationChange: -339531,
      dataDate: '09/29/18',
      changeDate: '09/22/18',
      source: 'OLCI',
      sourceFrequency: 'Weekly',
      validCellCount: 3,
      notes: [],
      marked: false
    }),
  Object.assign(new Location(),
    {
      id: 100003,
      type: 1,
      name: 'Devils Elbow Post Light',
      latitude: 28.63361111,
      longitude: -81.62500000,
      latitude_deg: 28,
      latitude_min: 38,
      latitude_sec: 1,
      latitude_dir: 'N',
      longitude_deg: 81,
      longitude_min: 37,
      longitude_sec: 30,
      longitude_dir: 'W',
      cellConcentration: 870963,
      maxCellConcentration: 1047128,
      concentrationChange: 112386,
      dataDate: '10/13/18',
      changeDate: '09/13/18',
      source: 'OLCI',
      sourceFrequency: 'Weekly',
      validCellCount: 6,
      notes: [],
      marked: true
    }),
  Object.assign(new Location(),
    {
      id: 100004,
      type: 2,
      name: 'Chestatee Bay',
      latitude: 34.27055556,
      longitude: -83.95583333,
      latitude_deg: 34,
      latitude_min: 16,
      latitude_sec: 14,
      latitude_dir: 'N',
      longitude_deg: 83,
      longitude_min: 57,
      longitude_sec: 21,
      longitude_dir: 'W',
      cellConcentration: 12589,
      maxCellConcentration: 48977,
      concentrationChange: -29097,
      dataDate: '01/20/18',
      changeDate: '01/12/18',
      source: 'MERIS',
      sourceFrequency: 'Daily',
      validCellCount: 9,
      notes: [],
      marked: false
    })
];
