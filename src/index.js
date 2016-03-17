var child_process = require('child_process');

var spawn = {
  darwin: function(pid)
  {
    return child_process.spawn('pgrep', ['-P', pid.toString()]);
  },
  linux: function(pid)
  {
    child_process.spawn('ps', ['-o', 'pid', '--no-headers', '--ppid', pid.toString()]);
  }
};

function children(pid)
{
  'use strict';

  return new Promise(function(resolve)
  {
    var ps;

    if(process.platform === 'darwin')
      ps = spawn.darwin(pid);
    else
      ps = spawn.linux(pid);

    var data = '';
    ps.stdout.on('data', function (chunk)
    {
      data += chunk.toString('ascii');
    });

    ps.on('close', function()
    {
      var children = [];

      (data.match(/\d+/g) || []).forEach(function(child)
      {
        children.push(parseInt(child, 10));
      });

      resolve(children);
    });
  });
}

/*function pgrep(pid)
{
  'use strict';

  switch(process.platform)
  {
    case 'darwin':
      return pgrep_darwin(pid);
    default:
      return pgrep_linux(pid);
  }
}

function pstree(pid)
{
  'use strict';
  try
  {
    process.kill(pid, 'SIGSTOP');
  } catch(error) {}
}*/
