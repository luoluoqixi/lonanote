import dayjs from 'dayjs';

export const timeUtils = {
  getTimeFormat: (time: number | null | undefined) => {
    return time ? dayjs(time * 1000).format('YYYY-MM-DD HH:mm:ss') : 'Unknow';
  },
};
