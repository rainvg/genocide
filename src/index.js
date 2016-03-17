var child_process = require('child_process');

function get_children(pid)
{
  'use strict';

  var spawn = {
    darwin: function(pid)
    {
      return child_process.spawn('pgrep', ['-P', pid.toString()]);
    },
    linux: function(pid)
    {
      return child_process.spawn('ps', ['-o', 'pid', '--no-headers', '--ppid', pid.toString()]);
    }
  };

  return new Promise(function(resolve)
  {
    process.kill(pid, 'SIGSTOP');

    var ps = (process.platform === 'darwin') ? spawn.darwin(pid) : spawn.linux(pid);

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

function get_tree(pid)
{
  'use strict';

  if(pid === process.pid)
    return Promise.resolve({});

  return new Promise(function(resolve)
  {
    get_children(pid).then(function(children)
    {
      if(children.length === 0)
        resolve({});

      var branch = {};

      children.forEach(function(child)
      {
        branch[child] = null;
      });

      children.forEach(function(child)
      {
        get_tree(child).then(function(child_branch)
        {
          branch[child] = child_branch;

          var resolved = true;
          for(var b in branch) if(branch[b] === null) resolved = false;

          if(resolved)
            resolve(branch);
        });
      });
    });
  });
}

function genocide(pid)
{
  'use strict';

  if(process.platform === 'win32')
  {
    return new Promise(function(resolve)
    {
      var tk = child_process.spawn('taskkill', ['/pid', pid.toString(), '/T', '/F'], {detached: true});
      tk.on('close', function()
      {
        resolve();
      });
    });
  }

  return get_tree(pid).then(function(tree)
  {
    (function recurkill(bpid, branch)
    {
      if(bpid === process.pid)
        return;

      for(var b in branch)
        recurkill(b, branch[b]);

      process.kill(bpid, 'SIGKILL');
    })(pid, tree);
  });
}

function seppuku()
{
  'use strict';
  child_process.spawn(process.argv[0], [__filename, process.pid.toString()], {detached: true});
}

if(require.main === module)
  genocide(parseInt(process.argv[2], 10));
else
  module.exports = {
    genocide: genocide,
    seppuku: seppuku
  };
