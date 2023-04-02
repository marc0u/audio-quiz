/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import Container from "@material-ui/core/Container";
import AppBar from "@material-ui/core/AppBar";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import PersonIcon from "@material-ui/icons/Person";
import PeopleIcon from "@material-ui/icons/People";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import FormLabel from "@material-ui/core/FormLabel";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import { first, isEmpty } from "lodash";
import CircularProgress from "@material-ui/core/CircularProgress";
import TabPanel from "./tabpanel";
import TodoContainer from "../TodoContainer";
import TeamContainer from "../TeamContainer";
import { withFirebase } from "../../hoc/withFirebase";
import { withUser } from "../../hoc/withUser";
import { Typography } from "@material-ui/core";
import MediaCard from "../../components/MediaCard";

function a11yProps(index) {
  return {
    id: `scrollable-auto-tab-${index}`,
    "aria-controls": `scrollable-auto-tabpanel-${index}`,
  };
}

const HomeContainer = ({ firebase, user }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState(null);
  const [userTodos, setUserTodos] = useState([]);

  const handleChangeTab = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const completeTeamMembersData = async (teamObj) => {
    const memberPromises = [];
    const { members } = teamObj;
    members.forEach((member) => {
      memberPromises.push(member.get());
    });
    const memebersData = await Promise.all(memberPromises);
    if (memebersData && memebersData.length > 0) {
      memebersData.forEach((member, index) => {
        members[index] = member.data();
      });
    }
    return members;
  };

  async function fetchData() {
    setLoading(true);
    const teams = await firebase.getCollectionData({
      collection: "teams",
      where: { field: "author", op: "==", value: user.uid },
    });
    const ownedTeam = first(teams);
    if (!isEmpty(ownedTeam)) {
      if (ownedTeam.members.length > 0) {
        const teamMembers = await completeTeamMembersData(ownedTeam);
        ownedTeam.membersData = teamMembers;
      }
      setTeam(ownedTeam);
    }
    setLoading(false);
  }

  async function fetchJoinedData() {
    setLoading(true);
    const joinedTeam = await firebase.getDocumentData({
      collection: "teams",
      documentId: user.team,
    });
    if (!isEmpty(joinedTeam)) {
      if (joinedTeam.members.length > 0) {
        const teamMembers = await completeTeamMembersData(joinedTeam);
        joinedTeam.membersData = teamMembers;
      }
      setTeam(joinedTeam);
    }
    setLoading(false);
  }

  const handleAddTodo = (addTodo, text) => {
    const newTodo = { id: addTodo.id, text, completed: false, editable: false };
    // Add todo to the beginnning of array
    userTodos.unshift(newTodo);
    setUserTodos(userTodos);
  };

  // To fetch team data
  useEffect(() => {
    if (isEmpty(user.team)) {
      fetchData();
    } else if (!isEmpty(user.team)) {
      fetchJoinedData();
    }
  }, []);

  // To fetch TODOS data
  useEffect(() => {
    async function fetchTodosData() {
      setLoading(true);
      let todos = await firebase.getCollectionData({
        collection: "todos",
        where: { field: "author", op: "==", value: user.uid },
      });
      todos = todos.map((todo) => {
        return { ...todo, editable: false };
      });
      console.log({ todos });
      setUserTodos(todos);
      setLoading(false);
    }
    fetchTodosData();
  }, []);

  // To fetch realtime task assigned
  useEffect(() => {
    const unsubscribe = firebase.db
      .collection("todos")
      .onSnapshot((snapshot) => {
        if (!snapshot.empty) {
          const myDataArray = [];
          snapshot.forEach((doc) => {
            const rtTodo = doc.data();
            // If has been assigned to auth user
            if (rtTodo.assigning && rtTodo.author === user.uid) {
              myDataArray.push({ ...rtTodo });
              const rtTodoRef = firebase.getRef({
                collection: "todos",
                doc: doc.id,
              });
              // Update flag
              rtTodoRef.update({ assigning: false });
              // Update current state
              handleAddTodo(rtTodo, rtTodo.text);
            }
          });
        }
      });
    return () => {
      unsubscribe();
    };
  }, [firebase]);

  if (loading)
    return (
      <div className="loading-container">
        <h2>Loading Application...</h2>
        <CircularProgress size={68} />
        <style jsx>
          {`
            .loading-container {
              width: 100%;
              height: 80%;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
          `}
        </style>
      </div>
    );

  return (
    <Container maxWidth="md">
      <Typography align="center" variant="h4">
        ¿De qué grupo o solista es el solo de guitarra?
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          p: 2,
        }}
      >
        <Box sx={{ ml: 5 }}>
          <FormControl>
            <RadioGroup
              aria-labelledby="demo-radio-buttons-group-label"
              defaultValue="female"
              name="radio-buttons-group"
            >
              <FormControlLabel
                value="female"
                control={<Radio />}
                label="Female"
              />
              <FormControlLabel value="male" control={<Radio />} label="Male" />
              <FormControlLabel
                value="other"
                control={<Radio />}
                label="Other"
              />
            </RadioGroup>
          </FormControl>
        </Box>
        <Box sx={{ height: "30px" }}></Box>
        <Button variant="contained">Siguiente</Button>
      </Box>
    </Container>
  );
};

export default withUser(withFirebase(HomeContainer));
