import type { CloudProviderInfo, CloudProvider } from '@/types'

export const cloudProviders: Record<CloudProvider, CloudProviderInfo> = {
  aliyun: {
    key: 'aliyun',
    name: '阿里云OSS',
    icon: '阿',
    color: '#ff6a00',
    regions: ['oss-cn-hangzhou', 'oss-cn-shanghai', 'oss-cn-beijing', 'oss-cn-shenzhen', 'oss-cn-guangzhou', 'oss-cn-chengdu', 'oss-cn-hongkong', 'oss-us-west-1', 'oss-us-east-1', 'oss-ap-southeast-1'],
    defaultEndpoint: 'oss-cn-hangzhou.aliyuncs.com'
  },
  tencent: {
    key: 'tencent',
    name: '腾讯云COS',
    icon: '腾',
    color: '#006eff',
    regions: ['ap-beijing', 'ap-beijing-1', 'ap-beijing-2', 'ap-chengdu', 'ap-chongqing', 'ap-guangzhou', 'ap-guangzhou-2', 'ap-guangzhou-3', 'ap-shanghai', 'ap-shanghai-1', 'ap-shanghai-2', 'ap-shenzhen-fsi', 'ap-shenzhen', 'ap-hongkong', 'ap-singapore', 'ap-mumbai', 'ap-seoul', 'ap-tokyo', 'ap-bangkok', 'na-siliconvalley', 'na-ashburn', 'eu-frankfurt', 'eu-moscow'],
    defaultEndpoint: 'cos.ap-beijing.myqcloud.com'
  },
  huawei: {
    key: 'huawei',
    name: '华为云OBS',
    icon: '华',
    color: '#ff6900',
    regions: ['cn-north-1', 'cn-north-4', 'cn-east-2', 'cn-east-3', 'cn-south-1', 'cn-southwest-2', 'ap-southeast-1', 'ap-southeast-2', 'ap-southeast-3', 'af-south-1', 'sa-brazil-1'],
    defaultEndpoint: 'obs.cn-north-1.myhuaweicloud.com'
  },
  qiniu: {
    key: 'qiniu',
    name: '七牛云Kodo',
    icon: '七',
    color: '#2b82d9',
    regions: ['z0', 'z1', 'z2', 'na0', 'as0'],
    defaultEndpoint: 's3-cn-east-1.qiniucs.com'
  },
  jdcloud: {
    key: 'jdcloud',
    name: '京东云OSS',
    icon: '京',
    color: '#e74c3c',
    regions: ['cn-north-1', 'cn-east-1', 'cn-east-2', 'cn-south-1', 'cn-northwest-1'],
    defaultEndpoint: 's3.cn-north-1.jdcloud-oss.com'
  },
  ksyun: {
    key: 'ksyun',
    name: '金山云KS3',
    icon: '金',
    color: '#ff6b35',
    regions: ['cn-beijing-6', 'cn-shanghai-2', 'cn-guangzhou-1', 'cn-hongkong-1', 'us-east-1', 'us-west-1'],
    defaultEndpoint: 'ks3-cn-beijing-6.ksyuncs.com'
  },
  qingcloud: {
    key: 'qingcloud',
    name: '青云QingStor',
    icon: '青',
    color: '#00d4aa',
    regions: ['pek3a', 'pek3b', 'sh1a', 'sh1b', 'gd2a', 'gd2b', 'ap2a', 'ap2b', 'ap1a', 'ap1b'],
    defaultEndpoint: 's3.pek3a.qingstor.com'
  },
  aws: {
    key: 'aws',
    name: 'AWS S3',
    icon: 'A',
    color: '#ff9900',
    regions: ['us-east-1', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1', 'ap-south-1', 'sa-east-1'],
    defaultEndpoint: 's3.amazonaws.com'
  },
  minio: {
    key: 'minio',
    name: 'MinIO',
    icon: 'M',
    color: '#29c4d0',
    regions: ['default'],
    defaultEndpoint: 'localhost:9000'
  }
}

export const getProviderInfo = (provider: CloudProvider): CloudProviderInfo => {
  return cloudProviders[provider]
}

export const getProviderList = (): CloudProviderInfo[] => {
  return Object.values(cloudProviders)
}
