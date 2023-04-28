import { types, onSnapshot, getRoot } from "mobx-state-tree";
import { User } from "@8hourrelay/models";
import { IRootStore } from "./RootStore";

const { map, union, safeReference, reference } = types;

const getTypeFromJson = (json) => {
  const identifier = json.id || json;
  return identifier.startsWith("repo") ? reference(User) : reference(User);
};

export const RouteParam = map(
  union({ dispatcher: getTypeFromJson }, safeReference(User))
);

export const RouteParams = types.model("RouteParams", {
  routeKey: types.identifier,
  params: RouteParam,
});

export const NavigationStore = types
  .model("NavigationStore", {
    paramsMap: map(RouteParams),
  })
  .views((self) => ({
    getParamsForCurrentRoute(navigation) {
      const {
        state: { key },
      } = navigation;
      let paramsObject = {};
      Array.from(self.paramsMap.get(key).params.entries()).forEach(
        ([key, value]) => {
          paramsObject[key] = value;
        }
      );
      return paramsObject;
    },
  }))
  .actions((self) => ({
    setParamsForRoute(params: typeof RouteParams) {
      self.paramsMap.put(params);
    },
    afterCreate() {
      onSnapshot(self, () => {
        const rootStore: IRootStore = getRoot(self);
        rootStore.save();
      });
    },
  }));