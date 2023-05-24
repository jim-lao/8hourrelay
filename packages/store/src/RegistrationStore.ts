import { makeObservable, observable, action, computed, flow } from "mobx";
import { BaseStore } from "./UIBaseStore";
import { UserStore } from "./UserStore";
import { event2023, RaceEntry } from "@8hourrelay/models";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setDoc, doc, deleteDoc, getFirestore } from "firebase/firestore";
import { toast } from "react-toastify";

import {
  getFunctions,
  httpsCallable,
  HttpsCallableResult,
} from "firebase/functions";

import { entryFormSnapshot } from "./RootStore";
import { getApp } from "firebase/app";

export type RegistrationState =
  | "INIT"
  | "SHOW" // show a form
  | "RE_EDIT" // editing form
  | "EDIT" // editing form
  | "CONFIRM" // confirm form
  | "FORM_SUBMITTED" //form submitted
  | "ERROR"
  | "SUCCESS";

// entries user can update after register payment
export const editableEntries = [
  "firstName",
  "lastName",
  "preferName",
  "personalBest",
  "email", // for other people's entry
  "phone",
  "gender",
  "size",
  "team",
  "emergencyName",
  "emergencyPhone",
];

export class RegistrationStore extends BaseStore {
  editIndex: number | null = null; // current edit raceEntries index
  userStore: UserStore | null = null;
  state: RegistrationState = "INIT";
  form: RaceEntry | null = null;
  teamValidated = false;
  constructor() {
    super();
    makeObservable(this, {
      editIndex: observable,
      state: observable,
      teamValidated: observable,
      form: observable,
      setForm: action,
      setState: action,
      setEditIndex: action,
      setTeamValidated: action,
      raceEntry: computed,
      onGetStripeSession: flow,
      deleteRaceEntry: flow,
      updateRaceEntry: flow,
      submitRaceForm: flow,
      validateTeamPassword: flow,
    });
  }

  setTeamValidated(status: boolean) {
    this.teamValidated = status;
  }

  attachedUserStore(userStore: UserStore) {
    this.userStore = userStore;
  }

  reset(): void {
    super.reset();
    this.form = null;
    this.state = "INIT";
  }

  setForm(form: RaceEntry | null) {
    this.form = form ? form : null;
  }

  setEditIndex(index: number | null) {
    this.editIndex = index;
  }

  get db() {
    const app = getApp();
    const db = getFirestore(app);
    return db;
  }

  get raceEntry() {
    if (
      this.editIndex !== null &&
      this.userStore?.raceEntries &&
      this.userStore.raceEntries.length > 0
    ) {
      return this.userStore.raceEntries[this.editIndex];
    }
    return null;
  }

  setState(state: RegistrationState) {
    this.state = state;
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  // team name could be passed
  initRaceEntryForm(team?: string) {
    if (this.state === "RE_EDIT" && this.form) return this.form;
    if (this.form) return this.form;
    const raceEntry = this.raceEntry;
    const user = this.userStore?.user;

    const raceInitEntry = {
      id: raceEntry?.id ?? "",
      year: raceEntry?.year ?? new Date().getFullYear().toString(),
      uid: this.userStore?.uid,
      email: raceEntry?.email ?? user?.email ?? "",
      firstName: raceEntry?.firstName ?? user?.firstName ?? "",
      lastName: raceEntry?.lastName ?? user?.lastName ?? "",
      preferName: raceEntry?.preferName ?? "",
      phone: raceEntry?.phone ?? user?.phone ?? "",
      gender: raceEntry?.gender ?? user?.gender ?? "",
      wechatId: raceEntry?.wechatId ?? user?.wechatId ?? "",
      birthYear: raceEntry?.birthYear ?? user?.birthYear ?? "",
      personalBest: raceEntry?.personalBest ?? user?.personalBest ?? "",
      race: raceEntry?.race ?? "",
      size: raceEntry?.size ?? "",
      emergencyName: raceEntry?.emergencyName ?? "",
      emergencyPhone: raceEntry?.emergencyPhone ?? "",
      isActive: raceEntry?.isActive ?? true,
      isPaid: raceEntry?.isPaid ?? false,
      team: team ? team : raceEntry?.team ?? "",
      teamPassword: "",
      teamState: "",
      accepted: false,
    };
    return raceInitEntry;
  }

  *updateRaceEntry(form: RaceEntry) {
    console.log(`Updating race entry to new data`, {
      form,
      index: this.editIndex,
    });
    this.isLoading = true;
    try {
      const data: any = {};
      Object.entries(form).forEach((e) => {
        if (e[1] && editableEntries.includes(e[0])) {
          data[e[0]] = e[1];
        }
      });
      console.log(`update race with data`, { data });
      if (this.userStore?.uid && this.raceEntry) {
        const id = this.raceEntry.id;
        yield setDoc(
          doc(this.db, "Users", this.userStore.uid, "RaceEntry", id),
          data,
          {
            merge: true,
          }
        );
        yield AsyncStorage.removeItem(entryFormSnapshot);
        this.setEditIndex(null);
        this.setState("SUCCESS");
      } else {
        throw new Error(`Failed to update race entry! Missing uid and raceId`);
      }
      this.isLoading = false;
    } catch (error) {
      console.log(`failed to Update Race Entry`, error);
      this.error = (error as Error).message;
      this.isLoading = false;
      this.setState("ERROR");
    }
  }

  *deleteRaceEntry() {
    if (this.isLoading) return;
    const idd = toast.loading(`Deleting race entry...`);
    this.isLoading = true;
    try {
      if (!this.raceEntry || !this.editIndex) {
        throw new Error(`No selected delete race entry`);
      }
      const id = this.raceEntry.id;
      const index = this.editIndex;
      // const newEntry = this.raceEntries?.filter(f=>f.id!==id)
      this.setEditIndex(null);
      this.userStore?.spliceRaceEntry(index);
      yield deleteDoc(
        doc(this.db, "Users", this.userStore?.uid!, "RaceEntry", id)
      );
      toast.update(idd, {
        render: `Race entry deleted successfully`,
        type: "success",
        isLoading: false,
        autoClose: 5000,
      });
    } catch (error) {
      console.log(`failed to getUser`, error);
      this.error = (error as Error).message;
      toast.update(idd, {
        render: `Failed to delete race entry`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
    this.isLoading = false;
  }

  *onGetStripeSession(sessionId: string) {
    if (this.isLoading) return;
    const functions = getFunctions();
    const onGetStripeSession = httpsCallable(functions, "onGetStripeSession");

    this.isLoading = true;
    try {
      const result: HttpsCallableResult<{ id: string }> =
        yield onGetStripeSession({ session_id: sessionId });
      console.log(`session result`, result);

      return result.data;
    } catch (error) {
      console.log(``, { error });
      this.error = (error as Error).message;
    }
    this.isLoading = false;
    return null;
  }

  *submitRaceForm(): unknown {
    if (this.isLoading) return;
    const functions = getFunctions();
    const onCreateCheckout = httpsCallable(functions, "onCreateCheckout");
    if (!this.form) {
      this.setError(`Invalid data`);
      return;
    }
    const { team, teamPassword } = this.form;

    if (!team && teamPassword) {
      this.setError(`Invalid data`);
      return;
    }

    const id = toast.loading(`Submiting race entry...`);
    this.isLoading = true;

    try {
      if (!this.teamValidated) {
        const isPasswordValid = yield this.validateTeamPassword(
          team!,
          teamPassword!
        );
        if (!isPasswordValid) {
          this.setError(`Team password is not correct`);
          this.isLoading = false;
          return;
        }
      }
      const result: HttpsCallableResult<unknown> = yield onCreateCheckout(
        this.form
      );
      console.log(`submit result`, result);

      if (result) {
        this.setEditIndex(null);
        toast.update(id, {
          render: `Race entry submitted successfully`,
          type: "success",
          isLoading: false,
          autoClose: 5000,
        });
        return result.data;
      }
    } catch (error) {
      console.log(``, { error });
      this.error = (error as Error).message;
    }
    this.isLoading = false;
    toast.update(id, {
      render: `Failed to submit race entry`,
      type: "error",
      isLoading: false,
      autoClose: 5000,
    });
    this.setState("ERROR");
    return null;
  }

  *validateTeamPassword(team: string, teamPassword: string) {
    if (this.isLoading) return;
    const functions = getFunctions();
    const onValidateTeamPassword = httpsCallable(
      functions,
      "onValidateTeamPassword"
    );

    const id = toast.loading(`Validating team password...`);
    this.setLoading(true);
    try {
      const result: HttpsCallableResult<unknown> = yield onValidateTeamPassword(
        { team: team.toLowerCase(), teamPassword }
      );
      console.log(`validated result`, result.data);

      if (result.data) {
        this.setTeamValidated(true);
        toast.update(id, {
          render: `Team password validated`,
          type: "success",
          isLoading: false,
          autoClose: 5000,
        });
        this.setLoading(false);
        return true;
      }
    } catch (error) {
      console.log(``, { error });
      this.error = (error as Error).message;
    }
    this.setLoading(false);
    toast.update(id, {
      render: `Invalid team password`,
      type: "error",
      isLoading: false,
      autoClose: 5000,
    });
    return false;
  }
}