import { pkgUp, winPath } from '@umijs/utils';
import assert from 'assert';
import { dirname, extname, isAbsolute, join } from 'path';

interface IAlias {
  [key: string]: string;
}

function isJSFile(path: string) {
  return ['.js', '.jsx', '.ts', '.tsx'].includes(extname(path));
}

function addLastSlash(path: string) {
  return path.endsWith('/') ? path : `${path}/`;
}

export function getAliasedDep(opts: { dep: string; webpackAlias?: IAlias }) {
  let dep = opts.dep;
  const webpackAlias = opts.webpackAlias || {};

  // get aliased dep
  for (const key of Object.keys(webpackAlias)) {
    const value = webpackAlias[key];
    if (isJSFile(value)) {
      if (dep === key) {
        dep = value;
        break;
      }
    } else {
      if (dep === key) {
        dep = value;
        break;
      }

      const slashedKey = addLastSlash(key);
      if (dep.startsWith(slashedKey)) {
        dep = dep.replace(new RegExp(`^${slashedKey}`), addLastSlash(value));
        break;
      }
    }
  }

  return dep;
}

export function getDepVersion(opts: {
  dep: string;
  cwd: string;
  webpackAlias?: IAlias;
  from?: string;
}) {
  const originDep = opts.dep;
  let version = '*';
  const dep = getAliasedDep(opts);

  // absolute
  if (isAbsolute(dep)) {
    let tmpDep = dep;
    let tmpVersion;
    let count = 0;
    // Fix invalid package.json
    // ref: https://unpkg.alibaba-inc.com/browse/@babel/runtime@7.14.6/helpers/esm/package.json
    while (!tmpVersion && count <= 10) {
      const pkg = pkgUp.sync({ cwd: tmpDep });
      assert(
        pkg,
        `[MFSU] package.json not found for dep ${originDep} which is imported from ${opts.from}`,
      );
      tmpVersion = require(pkg).version;
      tmpDep = dirname(dirname(pkg));
      count += 1;
    }
    assert(
      count !== 10,
      `[MFSU] infinite loop when finding version for dep ${originDep} which is imported from ${opts.from}`,
    );
    version = tmpVersion;
  } else {
    const pkg = pkgUp.sync({
      cwd: join(opts.cwd, 'node_modules', dep),
    });
    assert(
      pkg,
      `[MFSU] package.json not found for dep ${originDep} which is imported from ${opts.from}`,
    );
    assert(
      winPath(pkg) !== winPath(join(opts.cwd, 'package.json')),
      `[MFSU] package.json not found for dep ${originDep} which is imported from ${opts.from}`,
    );
    version = require(pkg).version;
  }

  return version;
}
