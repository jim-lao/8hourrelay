import { types } from "mobx-state-tree";
import { User } from "@8hourrelay/models";

export const UserStore = types
  .model("UserStore", {
    identifier: types.optional(types.identifier, "UserStore"),
    user: types.maybeNull(User),
    isLoading: types.boolean,
  })
  .actions((self) => ({
    async getUser() {
      return Promise.resolve(self);
    },
  }));