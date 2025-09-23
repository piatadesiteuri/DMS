import React from 'react';
import { Card, Progress, Space, Typography } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';

const { Text } = Typography;

const StorageInfo = ({ used, total, percentage }) => {
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 MB';
    return parseFloat(bytes).toFixed(2) + ' MB';
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 90) return '#ff4d4f';
    if (percentage >= 70) return '#faad14';
    return '#52c41a';
  };

  return (
    <Card 
      title={
        <Space>
          <DatabaseOutlined />
          <Text>Storage Usage</Text>
        </Space>
      }
      className="mb-4"
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Progress 
          percent={percentage} 
          status={percentage >= 90 ? 'exception' : percentage >= 70 ? 'warning' : 'success'}
          strokeColor={getStatusColor(percentage)}
        />
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>
            Used: {formatBytes(used)} of {formatBytes(total)}
          </Text>
          <Text>
            Available: {formatBytes(total - used)}
          </Text>
        </Space>
      </Space>
    </Card>
  );
};

export default StorageInfo; 