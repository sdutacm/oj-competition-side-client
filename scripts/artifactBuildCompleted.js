// 过滤发布文件，排除 .yml 和 .blockmap 文件
module.exports = async function(context) {
  const { artifactPaths } = context;
  
  // 过滤掉 .yml 和 .blockmap 文件
  const filteredPaths = artifactPaths.filter(path => {
    const fileName = path.toLowerCase();
    return !fileName.endsWith('.yml') && 
           !fileName.endsWith('.yaml') && 
           !fileName.endsWith('.blockmap');
  });
  
  console.log('原始文件数量:', artifactPaths.length);
  console.log('过滤后文件数量:', filteredPaths.length);
  
  // 打印被过滤掉的文件
  const filtered = artifactPaths.filter(path => !filteredPaths.includes(path));
  if (filtered.length > 0) {
    console.log('已过滤的文件:');
    filtered.forEach(file => console.log('  -', file));
  }
  
  // 返回过滤后的文件路径
  context.artifactPaths = filteredPaths;
};
